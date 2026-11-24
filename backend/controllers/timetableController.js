const XLSX = require("xlsx");
const bcrypt = require("bcryptjs");

const Timetable = require("../models/timetableModel");
const Batch = require("../models/batchModel");
const Teacher = require("../models/teacherModel");
const Subject = require("../models/subjectModel");
const Student = require("../models/studentModel");

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const populatedQuery = (query) =>
  query
    .populate("batch", "name startYear endYear")
    .populate("teacher", "name email")
    .populate("subject", "name");

const normalizeDay = (day) => {
  const match = DAY_ORDER.find(
    (item) => item.toLowerCase() === String(day || "").trim().toLowerCase()
  );
  return match || "";
};

const normalizeTime = (value) => {
  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);

  if (!match) return "";

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (minutes > 59 || hours > 23) return "";
  if (meridiem) {
    if (hours < 1 || hours > 12) return "";
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const overlaps = (left, right) =>
  left.startTime < right.endTime && left.endTime > right.startTime;

const describeEntry = (entry) =>
  `${entry.day} ${entry.startTime}-${entry.endTime} (${entry.batchName || entry.batch})`;

const validateSlot = ({ day, startTime, endTime }) => {
  if (!normalizeDay(day)) return "Select a valid day";
  if (!normalizeTime(startTime) || !normalizeTime(endTime)) {
    return "Start time and end time must use HH:mm format";
  }
  if (normalizeTime(startTime) >= normalizeTime(endTime)) {
    return "End time must be later than start time";
  }
  return "";
};

const findConflict = async (entry, excludeId, entries = null) => {
  const candidates =
    entries ||
    (await Timetable.find({
      day: entry.day,
      ...(excludeId ? { _id: { $ne: excludeId } } : {})
    }).lean());

  const teacherConflict = candidates.find(
    (item) =>
      item.teacher.toString() === entry.teacher.toString() &&
      overlaps(item, entry)
  );

  if (teacherConflict) {
    return `Teacher Conflict Detected: ${entry.teacherName || "teacher"} has overlapping classes at ${describeEntry(
      teacherConflict
    )} and ${describeEntry(entry)}`;
  }

  const batchConflict = candidates.find(
    (item) =>
      item.batch.toString() === entry.batch.toString() &&
      overlaps(item, entry)
  );

  if (batchConflict) {
    return `Batch Conflict Detected: ${entry.batchName || "batch"} has overlapping subjects at ${describeEntry(
      batchConflict
    )} and ${describeEntry(entry)}`;
  }

  return "";
};

const validateReferences = async ({ batch, teacher, subject }) => {
  const [batchRecord, teacherRecord, subjectRecord] = await Promise.all([
    Batch.findById(batch),
    Teacher.findById(teacher),
    Subject.findById(subject)
  ]);

  if (!batchRecord) return "Batch not found";
  if (!teacherRecord) return "Teacher not found";
  if (!subjectRecord) return "Subject not found";
  if (subjectRecord.batch.toString() !== batchRecord._id.toString()) {
    return "Selected subject does not belong to the selected batch";
  }

  return "";
};

const buildEntry = (body) => ({
  batch: body.batch,
  teacher: body.teacher,
  subject: body.subject,
  day: normalizeDay(body.day),
  startTime: normalizeTime(body.startTime),
  endTime: normalizeTime(body.endTime)
});

exports.getTimetable = async (req, res) => {
  try {
    const filter = {};
    if (req.query.batch) filter.batch = req.query.batch;
    if (req.query.teacher) filter.teacher = req.query.teacher;
    if (req.query.day) filter.day = normalizeDay(req.query.day);

    const entries = await populatedQuery(Timetable.find(filter)).lean();
    entries.sort(
      (left, right) =>
        DAY_ORDER.indexOf(left.day) - DAY_ORDER.indexOf(right.day) ||
        left.startTime.localeCompare(right.startTime)
    );

    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createEntry = async (req, res) => {
  try {
    const entry = buildEntry(req.body);
    const invalidSlot = validateSlot(entry);
    if (invalidSlot) return res.status(400).json({ message: invalidSlot });

    const referenceError = await validateReferences(entry);
    if (referenceError) return res.status(400).json({ message: referenceError });

    const conflict = await findConflict(entry);
    if (conflict) return res.status(409).json({ message: conflict });

    const created = await Timetable.create(entry);
    await created.populate("batch teacher subject");

    res.status(201).json({ message: "Timetable entry created", entry: created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateEntry = async (req, res) => {
  try {
    const current = await Timetable.findById(req.params.id);
    if (!current) return res.status(404).json({ message: "Timetable entry not found" });

    const entry = buildEntry({ ...current.toObject(), ...req.body });
    const invalidSlot = validateSlot(entry);
    if (invalidSlot) return res.status(400).json({ message: invalidSlot });

    const referenceError = await validateReferences(entry);
    if (referenceError) return res.status(400).json({ message: referenceError });

    const conflict = await findConflict(entry, current._id);
    if (conflict) return res.status(409).json({ message: conflict });

    Object.assign(current, entry);
    await current.save();
    await current.populate("batch teacher subject");

    res.json({ message: "Timetable entry updated", entry: current });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteEntry = async (req, res) => {
  try {
    const deleted = await Timetable.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Timetable entry not found" });

    res.json({ message: "Timetable entry deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getToday = () =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "Asia/Kolkata"
  }).format(new Date());

exports.getTeacherToday = async (req, res) => {
  try {
    if (req.user.role !== "teacher" || req.user.id !== req.params.teacherId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const day = getToday();
    const schedule = await populatedQuery(
      Timetable.find({ teacher: req.params.teacherId, day }).sort({ startTime: 1 })
    ).lean();

    res.json({ day, schedule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStudentToday = async (req, res) => {
  try {
    if (req.user.role !== "student" || req.user.id !== req.params.studentId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const day = getToday();
    const schedule = await populatedQuery(
      Timetable.find({ batch: student.batch, day }).sort({ startTime: 1 })
    ).lean();

    res.json({ day, schedule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCurrentTeacherSlot = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied" });
    }

    const now = new Date();
    const day = getToday();
    const currentTime = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata"
    }).format(now);

    const entry = await populatedQuery(
      Timetable.findOne({
        teacher: req.user.id,
        day,
        startTime: { $lte: currentTime },
        endTime: { $gt: currentTime }
      })
    ).lean();

    res.json({ day, currentTime, entry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const valueByHeader = (row, names) => {
  const key = Object.keys(row).find((item) =>
    names.includes(item.trim().toLowerCase())
  );
  return key ? row[key] : "";
};

const normalizeName = (value) =>
  String(value || "")
    .replace(/\b(er|dr|prof|mr|mrs|ms)\.?\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const cleanTeacherName = (value) =>
  String(value || "")
    .replace(/\b(er|dr|prof|mr|mrs|ms)\.?\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const cleanSubjectName = (value) =>
  String(value || "")
    .replace(/\(\s*[A-Z]+\s*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const parseTimeRange = (value) => {
  const match = String(value || "")
    .replace(/[()]/g, "")
    .trim()
    .match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);

  if (!match) return null;

  let startTime = normalizeTime(match[1]);
  let endTime = normalizeTime(match[2]);
  if (!startTime || !endTime) return null;

  if (Number(startTime.slice(0, 2)) < 7) {
    startTime = `${String(Number(startTime.slice(0, 2)) + 12).padStart(2, "0")}${startTime.slice(2)}`;
  }
  if (Number(endTime.slice(0, 2)) < 7) {
    endTime = `${String(Number(endTime.slice(0, 2)) + 12).padStart(2, "0")}${endTime.slice(2)}`;
  }

  return { startTime, endTime };
};

const parseGridCell = (value) => {
  const lines = String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2 || lines.join("").toUpperCase() === "LUNCH") return null;

  return {
    subjectName: cleanSubjectName(lines[0]),
    teacherName: cleanTeacherName(lines.slice(1).join(" "))
  };
};

const extractSectionName = (row) => {
  const text = row.map((value) => String(value || "")).join(" ");
  const match = text.match(/\b(\d\s*CSE\s*-\s*[A-Z])\b/i);
  return match ? match[1].replace(/\s+/g, "").toUpperCase() : "";
};

const parseWeeklyGridWorkbook = (workbook) => {
  const entries = [];

  workbook.SheetNames.forEach((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: ""
    });

    rows.forEach((row, index) => {
      const batchName = extractSectionName(row);
      if (!batchName) return;

      const headerRow = rows[index + 1] || [];
      const timeRow = rows[index + 2] || [];
      if (String(headerRow[1] || "").trim().toLowerCase() !== "days") return;

      const timeSlots = timeRow.map(parseTimeRange);

      for (let rowIndex = index + 3; rowIndex < rows.length; rowIndex += 1) {
        const day = normalizeDay(rows[rowIndex]?.[1]);
        if (!day) {
          if (extractSectionName(rows[rowIndex] || [])) break;
          continue;
        }

        for (let column = 2; column < rows[rowIndex].length; column += 1) {
          const time = timeSlots[column];
          const cell = parseGridCell(rows[rowIndex][column]);
          if (!time || !cell) continue;

          entries.push({
            batchName,
            day,
            ...time,
            ...cell,
            source: `${sheetName}: ${batchName} ${day}`
          });
        }
      }
    });
  });

  return entries;
};

const parseFlatWorkbook = (workbook) =>
  workbook.SheetNames.flatMap((sheetName) =>
    XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" }).map((row) => ({
      batchName: String(valueByHeader(row, ["batch", "batch name"])).trim(),
      teacherName: String(valueByHeader(row, ["teacher", "teacher name", "faculty"])).trim(),
      subjectName: String(valueByHeader(row, ["subject", "subject name"])).trim(),
      day: normalizeDay(valueByHeader(row, ["day"])),
      startTime: normalizeTime(valueByHeader(row, ["start time", "starttime", "start"])),
      endTime: normalizeTime(valueByHeader(row, ["end time", "endtime", "end"])),
      source: sheetName
    }))
  );

const findRawConflicts = (rows) => {
  const errors = [];

  rows.forEach((row, index) => {
    rows.slice(0, index).forEach((other) => {
      if (row.day !== other.day || !overlaps(row, other)) return;

      if (normalizeName(row.teacherName) === normalizeName(other.teacherName)) {
        errors.push(
          `Teacher Conflict Detected: ${cleanTeacherName(row.teacherName)} has overlapping classes at ${describeEntry(
            other
          )} and ${describeEntry(row)}`
        );
      }
      if (row.batchName.toLowerCase() === other.batchName.toLowerCase()) {
        errors.push(
          `Batch Conflict Detected: ${row.batchName} has overlapping subjects at ${describeEntry(
            other
          )} and ${describeEntry(row)}`
        );
      }
    });
  });

  return [...new Set(errors)];
};

const inferBatchYears = (batchName) => {
  const currentYear = new Date().getFullYear();
  const yearMatch = String(batchName).match(/^(\d)/);
  const courseYear = Number(yearMatch?.[1]) || 1;
  const startYear = currentYear - courseYear;
  return { startYear, endYear: startYear + 4 };
};

const makeFacultyEmail = (name, teachers) => {
  const base =
    normalizeName(name)
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "") || "faculty";
  let email = `${base}@nexus.local`;
  let suffix = 2;

  while (teachers.some((teacher) => teacher.email.toLowerCase() === email.toLowerCase())) {
    email = `${base}${suffix}@nexus.local`;
    suffix += 1;
  }

  return email;
};

exports.importTimetable = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Select an Excel file" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const flatRows = parseFlatWorkbook(workbook).filter(
      (row) => row.batchName && row.day && row.startTime && row.endTime && row.subjectName && row.teacherName
    );
    const gridRows = parseWeeklyGridWorkbook(workbook);
    const rows = flatRows.length > 0 ? flatRows : gridRows;
    const format = flatRows.length > 0 ? "normalized table" : "weekly departmental grid";

    if (rows.length === 0) {
      return res.status(400).json({ message: "The workbook does not contain timetable rows" });
    }

    const workbookConflicts = findRawConflicts(rows);
    if (workbookConflicts.length > 0) {
      return res.status(400).json({
        message: "Timetable import failed. Resolve the workbook conflicts shown below.",
        errors: workbookConflicts
      });
    }

    if (req.body.dryRun === "true") {
      return res.json({
        message: `Validated ${rows.length} timetable entries from ${format}. No conflicts detected.`,
        imported: 0,
        parsed: rows.length,
        format
      });
    }

    const [batches, teachers, subjects, existing] = await Promise.all([
      Batch.find().lean(),
      Teacher.find().lean(),
      Subject.find().lean(),
      req.body.replaceExisting === "false" ? Timetable.find().lean() : []
    ]);

    const prepared = [];
    const errors = [];
    const created = { batches: [], teachers: [], subjects: [] };
    const generatedTeacherPassword = "teacher123";
    const hashedTeacherPassword = await bcrypt.hash(generatedTeacherPassword, 10);

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;
      const batchName = row.batchName;
      const teacherName = cleanTeacherName(row.teacherName);
      const subjectName = cleanSubjectName(row.subjectName);

      let batch = batches.find((item) => item.name.toLowerCase() === batchName.toLowerCase());
      if (!batch) {
        batch = (await Batch.create({ name: batchName, ...inferBatchYears(batchName) })).toObject();
        batches.push(batch);
        created.batches.push(batch.name);
      }

      let teacher = teachers.find(
        (item) =>
          normalizeName(item.name) === normalizeName(teacherName) ||
          item.email.toLowerCase() === teacherName.toLowerCase()
      );
      if (!teacher) {
        const email = makeFacultyEmail(teacherName, teachers);
        teacher = (
          await Teacher.create({
            name: teacherName,
            email,
            password: hashedTeacherPassword,
            mobile: String(9000000000 + teachers.length),
            batch: batch._id,
            isMentor: false
          })
        ).toObject();
        teachers.push(teacher);
        created.teachers.push({ name: teacher.name, email, password: generatedTeacherPassword });
      }

      let subject = subjects.find(
        (item) =>
          cleanSubjectName(item.name) === subjectName &&
          batch &&
          item.batch.toString() === batch._id.toString()
      );
      if (!subject) {
        subject = (await Subject.create({ name: subjectName, batch: batch._id, teacher: teacher._id })).toObject();
        subjects.push(subject);
        created.subjects.push(`${subject.name} (${batch.name})`);
      } else if (subject.teacher?.toString() !== teacher._id.toString()) {
        await Subject.findByIdAndUpdate(subject._id, { teacher: teacher._id });
        subject.teacher = teacher._id;
      }

      const entry = {
        batch: batch?._id,
        teacher: teacher?._id,
        subject: subject?._id,
        day: row.day,
        startTime: row.startTime,
        endTime: row.endTime,
        batchName: batch.name,
        teacherName: teacher.name,
        subjectName: subject.name
      };

      const invalidSlot = validateSlot(entry);
      if (invalidSlot) {
        errors.push(`${row.source || `Row ${rowNumber}`}: ${invalidSlot}`);
        continue;
      }

      prepared.push(entry);
    }

    for (let index = 0; index < prepared.length; index += 1) {
      const conflict = await findConflict(
        prepared[index],
        null,
        [...existing, ...prepared.slice(0, index)]
      );
      if (conflict) errors.push(conflict);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Timetable import failed. No entries were changed.",
        errors
      });
    }

    if (req.body.replaceExisting !== "false") await Timetable.deleteMany({});
    await Timetable.insertMany(prepared);

    res.json({
      message: `Imported ${prepared.length} timetable entries from ${format}`,
      imported: prepared.length,
      format,
      created
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
