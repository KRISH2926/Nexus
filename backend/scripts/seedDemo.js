require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Batch = require("../models/batchModel");
const Subject = require("../models/subjectModel");
const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const Parent = require("../models/parentModel");
const Admin = require("../models/adminModel");
const SecurityPersonnel = require("../models/securityPersonnelModel");
const CampusGate = require("../models/campusGateModel");
const Timetable = require("../models/timetableModel");
const Gatepass = require("../models/gatepassModel");
const ParentNotification = require("../models/parentNotificationModel");

const DB_NAME = "nexus_demo";
const DOMAIN = "demo.nexus.invalid";
const outputPath = process.env.NEXUS_DEMO_CREDENTIALS_OUT
  ? path.resolve(process.env.NEXUS_DEMO_CREDENTIALS_OUT)
  : null;
const passwordFor = () => `NxDemo!${crypto.randomBytes(7).toString("base64url")}`;
const mobileFor = (index) => `900${String(index).padStart(7, "0")}`;
const setAccount = async (Model, email, values) => Model.findOneAndUpdate(
  { email }, { $set: values }, { upsert: true, new: true, setDefaultsOnInsert: true }
);

async function run() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required (value is intentionally not displayed)");
  await mongoose.connect(process.env.MONGO_URI, { dbName: DB_NAME, serverSelectionTimeoutMS: 8000 });

  const credentialRows = [];
  const batches = [];
  for (let i = 0; i < 2; i += 1) {
    const name = `NEXUS Demo Batch ${i === 0 ? "A" : "B"}`;
    batches.push(await Batch.findOneAndUpdate(
      { name }, { $set: { name, startYear: 2026, endYear: 2030 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ));
  }

  const teacherNames = ["Aarav Mehta", "Diya Nair", "Kabir Shah", "Mira Iyer", "Rehan Das", "Sana Kapoor"];
  const teachers = [];
  for (let i = 0; i < 6; i += 1) {
    const email = `teacher${String(i + 1).padStart(2, "0")}@${DOMAIN}`;
    const password = passwordFor();
    const teacher = await setAccount(Teacher, email, {
      name: teacherNames[i], email, password: await bcrypt.hash(password, 10), mobile: mobileFor(i + 1),
      batch: batches[Math.floor(i / 3)]._id, isMentor: i % 3 === 0, status: "active", emailVerified: true
    });
    teachers.push(teacher);
    credentialRows.push({ role: "Teacher", name: teacher.name, email, password, batch: batches[Math.floor(i / 3)].name });
  }

  const subjectsByBatch = [];
  const subjectNames = ["Mathematics", "Physics", "Computer Science", "Communication", "Data Systems", "Project Lab"];
  for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
    const subjects = [];
    for (let subjectIndex = 0; subjectIndex < subjectNames.length; subjectIndex += 1) {
      const teacher = teachers[batchIndex * 3 + (subjectIndex % 3)];
      const name = subjectNames[subjectIndex];
      subjects.push(await Subject.findOneAndUpdate(
        { name: `${name} — ${batches[batchIndex].name}` },
        { $set: { name: `${name} — ${batches[batchIndex].name}`, batch: batches[batchIndex]._id, teacher: teacher._id } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ));
    }
    subjectsByBatch.push(subjects);
  }

  const firstNames = ["Aanya", "Aarav", "Aditi", "Advik", "Anaya", "Arjun", "Avni", "Dev", "Diya", "Ishaan", "Ishita", "Kabir", "Kiara", "Mira", "Neel", "Nisha", "Pranav", "Riya", "Sana", "Vihaan", "Zoya", "Rehan", "Tara", "Yash", "Meera"];
  const lastNames = ["Sharma", "Mehta", "Nair", "Iyer", "Kapoor", "Rao", "Shah", "Das", "Patel", "Joshi"];
  const students = [];
  for (let i = 0; i < 50; i += 1) {
    const batchIndex = i < 25 ? 0 : 1;
    const sequence = i + 1;
    const rollNo = `NX${batchIndex === 0 ? "A" : "B"}${String((i % 25) + 1).padStart(3, "0")}`;
    const email = `student${String(sequence).padStart(3, "0")}@${DOMAIN}`;
    const parentEmail = `parent${String(sequence).padStart(3, "0")}@${DOMAIN}`;
    const studentName = `${firstNames[i % firstNames.length]} ${lastNames[(i * 7) % lastNames.length]}`;
    const parentName = `${firstNames[(i + 5) % firstNames.length]} ${lastNames[(i + 3) % lastNames.length]}`;
    const password = passwordFor();
    const student = await setAccount(Student, email, {
      name: studentName, rollNo, email, password: await bcrypt.hash(password, 10),
      parentName, parentEmail, studentMobile: mobileFor(100 + sequence), parentMobile: mobileFor(200 + sequence),
      batch: batches[batchIndex]._id, status: "active", emailVerified: true
    });
    students.push(student);
    credentialRows.push({ role: "Student", name: studentName, email, password, batch: batches[batchIndex].name, rollNo });

    const parentPassword = passwordFor();
    const parent = await Parent.findOneAndUpdate(
      { email: parentEmail },
      { $set: { name: parentName, email: parentEmail, password: await bcrypt.hash(parentPassword, 10),
        students: [student._id], status: "active", emailVerified: true }, $unset: { pendingStudent: 1, emailVerificationTokenHash: 1, emailVerificationExpiresAt: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    credentialRows.push({ role: "Parent", name: parentName, email: parentEmail, password: parentPassword, batch: batches[batchIndex].name, rollNo });

    const gatepass = await Gatepass.findOneAndUpdate(
      { student: student._id, reason: "Demo workflow sample: please review this request" },
      { $set: { student: student._id, mentor: teachers[batchIndex * 3]._id,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000), reason: "Demo workflow sample: please review this request",
        status: "parent_pending", teacherDecisionAt: new Date(), parentDecision: {} },
        $unset: { qrTokenHash: 1, issuedAt: 1, expiresAt: 1, quotaMonth: 1, exitRecord: 1, returnRecord: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await ParentNotification.findOneAndUpdate(
      { parent: parent._id, type: "gatepass-review", eventId: `demo-gatepass-${gatepass._id}` },
      { $set: { parent: parent._id, student: student._id, type: "gatepass-review",
        eventId: `demo-gatepass-${gatepass._id}`,
        message: "Demo notice: a sample gatepass request is waiting for your review in the parent portal.",
        emailStatus: "not_configured" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const adminEmail = `admin@${DOMAIN}`;
  const adminPassword = passwordFor();
  const admin = await setAccount(Admin, adminEmail, { name: "NEXUS Demo Administrator", email: adminEmail, password: await bcrypt.hash(adminPassword, 10), role: "admin", status: "active" });
  credentialRows.push({ role: "Admin", name: "NEXUS Demo Administrator", email: adminEmail, password: adminPassword });

  await CampusGate.findOneAndUpdate({ name: "Main Gate" }, { $set: { name: "Main Gate", location: "Campus entrance", status: "active",
    shifts: [{ name: "Day", startTime: "08:00", endTime: "16:00", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] }], changedBy: admin._id } },
  { upsert: true, new: true, setDefaultsOnInsert: true });

  const securityEmail = `security@${DOMAIN}`;
  const securityPassword = passwordFor();
  await setAccount(SecurityPersonnel, securityEmail, {
    name: "NEXUS Demo Security", email: securityEmail, password: await bcrypt.hash(securityPassword, 10),
    mobile: mobileFor(999), employeeId: "NX-DEMO-SEC-01", assignedGate: "Main Gate", assignedShift: "Day", status: "active", emailVerified: true
  });
  credentialRows.push({ role: "Security", name: "NEXUS Demo Security", email: securityEmail, password: securityPassword });

  const timetable = [];
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const slots = [["09:00", "09:50"], ["10:00", "10:50"], ["11:10", "12:00"], ["12:10", "13:00"]];
  for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
    for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
      for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
        const teacher = teachers[batchIndex * 3 + ((dayIndex + slotIndex) % 3)];
        const subject = subjectsByBatch[batchIndex][(dayIndex + slotIndex) % subjectsByBatch[batchIndex].length];
        const [startTime, endTime] = slots[slotIndex];
        const lesson = { batch: batches[batchIndex]._id, teacher: teacher._id, subject: subject._id, day: days[dayIndex], startTime, endTime };
        const saved = await Timetable.findOneAndUpdate(lesson, { $set: lesson }, { upsert: true, new: true, setDefaultsOnInsert: true });
        timetable.push({ batch: batches[batchIndex].name, day: days[dayIndex], startTime, endTime, subject: subject.name, teacher: teacher.name });
      }
    }
  }

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({ database: DB_NAME, generatedAt: new Date().toISOString(), counts: { students: students.length, batches: batches.length, teachers: teachers.length, parents: 50, timetableEntries: timetable.length }, credentials: credentialRows, timetable }, null, 2), { mode: 0o600 });
  }
  console.log(JSON.stringify({ database: DB_NAME, counts: { batches: batches.length, students: students.length, teachers: teachers.length, parents: 50, subjects: 12, gatepasses: students.length, parentNotifications: students.length, timetableEntries: timetable.length } }));
}

run().catch((error) => {
  console.error(`Demo seed failed (${error?.name || "Error"}).`);
  process.exitCode = 1;
}).finally(async () => mongoose.disconnect());
