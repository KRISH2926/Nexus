const express = require("express");
const router = express.Router();

const Attendance = require("../models/attendanceModel");
const Notification = require("../models/notificationModel");
const Subject = require("../models/subjectModel");
const Student = require("../models/studentModel");
const parentNotifications = require("../services/parentNotifications");

const {
  verifyToken,
  authorizeRoles
} = require("../middleware/authMiddleware");

const getTeacherSubject = async (subjectId, teacherId) =>
  Subject.findOne({ _id: subjectId, teacher: teacherId });

// ==========================
// TEACHER: MARK SINGLE ATTENDANCE
// ==========================
router.post(
  "/mark",
  verifyToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const { student, batch, subject, date, status } = req.body;

      if (!student || !batch || !subject || !date || !status) {
        return res.status(400).json({
          message: "All fields are required"
        });
      }

      const [assignedSubject, studentRecord] = await Promise.all([
        getTeacherSubject(subject, req.user.id),
        Student.findById(student).select("batch")
      ]);

      if (!assignedSubject) {
        return res.status(403).json({
          message: "You are not assigned to this subject"
        });
      }

      if (!studentRecord) {
        return res.status(404).json({ message: "Student not found" });
      }

      if (
        assignedSubject.batch.toString() !== String(batch) ||
        studentRecord.batch.toString() !== String(batch)
      ) {
        return res.status(403).json({
          message: "Student and subject must belong to the selected batch"
        });
      }

      const selectedDate = new Date(date);

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await Attendance.findOne({
        student,
        subject,
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      });

      if (existing) {
        return res.status(400).json({
          message: "Attendance already marked for this student on this date"
        });
      }

      const attendance = new Attendance({
        student,
        batch,
        subject,
        date: selectedDate,
        status
      });

      await attendance.save();

      res.json({
        message: "Attendance marked successfully",
        attendance
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ==========================
// TEACHER: MARK BULK ATTENDANCE
// ==========================
router.post(
  "/mark-bulk",
  verifyToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const { batch, subject, date, records } = req.body;

      if (
        !batch ||
        !subject ||
        !date ||
        !Array.isArray(records) ||
        records.length === 0
      ) {
        return res.status(400).json({
          message: "Batch, subject, date and records are required"
        });
      }

      if (records.some((record) => !record || typeof record !== "object")) {
        return res.status(400).json({ message: "Invalid attendance record" });
      }

      const studentIds = records.map((record) => record.student);
      if (
        studentIds.some((id) => !id) ||
        new Set(studentIds.map(String)).size !== studentIds.length ||
        records.some((record) => !["present", "absent"].includes(record.status))
      ) {
        return res.status(400).json({
          message: "Each student must appear once with a valid attendance status"
        });
      }

      const [assignedSubject, students] = await Promise.all([
        Subject.findOne({ _id: subject, batch, teacher: req.user.id }),
        Student.find({ _id: { $in: studentIds }, batch }).select("_id")
      ]);

      if (!assignedSubject) {
        return res.status(403).json({
          message: "You are not assigned to this subject and batch"
        });
      }

      if (students.length !== studentIds.length) {
        return res.status(403).json({
          message: "All students must belong to the selected batch"
        });
      }

      const selectedDate = new Date(date);

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const alreadyMarked = await Attendance.findOne({
        subject,
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      });

      if (alreadyMarked) {
        return res.status(400).json({
          message: "Attendance already marked for this subject on this date"
        });
      }

      const attendanceRecords = records.map((record) => ({
        student: record.student,
        batch,
        subject,
        date: selectedDate,
        status: record.status
      }));

      await Attendance.insertMany(attendanceRecords);

      res.json({
        message: "Attendance marked successfully",
        total: attendanceRecords.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ==========================
// MONTHLY STUDENT ATTENDANCE
// ==========================
router.get(
  "/monthly/:studentId/:subjectId/:month/:year",
  verifyToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const { studentId, subjectId, month, year } = req.params;

      const subject = await getTeacherSubject(subjectId, req.user.id);
      if (!subject) {
        return res.status(403).json({
          message: "You are not assigned to this subject"
        });
      }

      const student = await Student.findOne({
        _id: studentId,
        batch: subject.batch
      }).select("_id");

      if (!student) {
        return res.status(403).json({
          message: "Student is not in your assigned subject batch"
        });
      }

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const records = await Attendance.find({
        student: studentId,
        subject: subjectId,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      })
        .populate("student", "name rollNo email")
        .populate("subject", "name")
        .populate("batch", "name");

      const total = records.length;
      const present = records.filter((r) => r.status === "present").length;
      const absent = total - present;
      const percentage = total === 0 ? 0 : (present / total) * 100;

      res.json({
        total,
        present,
        absent,
        percentage: percentage.toFixed(2),
        records
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ==========================
// LOW MONTHLY ATTENDANCE ALERT
// ==========================
router.get(
  "/low-monthly/:subjectId/:month/:year",
  verifyToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const { subjectId, month, year } = req.params;

      const subject = await getTeacherSubject(subjectId, req.user.id);
      if (!subject) {
        return res.status(403).json({
          message: "You are not assigned to this subject"
        });
      }

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const records = await Attendance.find({
        subject: subjectId,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }).populate("student", "name rollNo email batch");

      const studentMap = {};

      records.forEach((record) => {
        const id = record.student._id.toString();

        if (!studentMap[id]) {
          studentMap[id] = {
            student: record.student,
            total: 0,
            present: 0
          };
        }

        studentMap[id].total++;

        if (record.status === "present") {
          studentMap[id].present++;
        }
      });

      const lowAttendanceStudents = [];

      for (const data of Object.values(studentMap)) {
        const percentage = (data.present / data.total) * 100;

        if (percentage < 50) {
          const message = `Low attendance alert: Your monthly attendance is ${percentage.toFixed(
            2
          )}%. Please improve your attendance.`;

          await Notification.findOneAndUpdate(
            {
              student: data.student._id,
              subject: subjectId,
              month: Number(month),
              year: Number(year),
              type: "low-attendance"
            },
            {
              student: data.student._id,
              subject: subjectId,
              month: Number(month),
              year: Number(year),
              message,
              type: "low-attendance"
            },
            { upsert: true, new: true }
          );

          await parentNotifications.notifyParents({
            studentId: data.student._id,
            studentName: data.student.name,
            type: "attendance-alert",
            eventId: `${data.student._id}-${subjectId}-${Number(year)}-${Number(month)}`,
            message: `A monthly attendance update for ${Number(month)}/${Number(year)} is available in the NEXUS parent portal.`
          });

          lowAttendanceStudents.push({
            student: data.student,
            total: data.total,
            present: data.present,
            absent: data.total - data.present,
            percentage: percentage.toFixed(2),
            notification: message
          });
        }
      }

      res.json({
        message: "Low monthly attendance students below 50%",
        students: lowAttendanceStudents
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ==========================
// STUDENT: VIEW ALL ATTENDANCE
// ==========================
router.get(
  "/student/:id",
  verifyToken,
  authorizeRoles("student", "teacher", "admin"),
  async (req, res) => {
    try {
      const student = await Student.findById(req.params.id).select("batch");

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      if (req.user.role === "student" && student._id.toString() !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (
        req.user.role === "teacher" &&
        !(await Subject.exists({ batch: student.batch, teacher: req.user.id }))
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      const records = await Attendance.find({
        student: student._id
      })
        .populate("subject")
        .populate("batch")
        .sort({ date: -1 });

      res.json(records);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ==========================
// SUBJECT-WISE ATTENDANCE %
// ==========================
router.get(
  "/student/:id/:subjectId",
  verifyToken,
  authorizeRoles("student", "teacher", "admin"),
  async (req, res) => {
    try {
      const student = await Student.findById(req.params.id).select("batch");

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      if (req.user.role === "student" && student._id.toString() !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectQuery = { _id: req.params.subjectId, batch: student.batch };
      if (req.user.role === "teacher") {
        subjectQuery.teacher = req.user.id;
      }

      if (!(await Subject.exists(subjectQuery))) {
        return res.status(403).json({ message: "Access denied" });
      }

      const records = await Attendance.find({
        student: student._id,
        subject: req.params.subjectId
      });

      const total = records.length;
      const present = records.filter((r) => r.status === "present").length;

      const percentage = total === 0 ? 0 : (present / total) * 100;

      res.json({
        total,
        present,
        absent: total - present,
        percentage: percentage.toFixed(2),
        records
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ==========================
// OLD LOW ATTENDANCE ALERT
// ==========================
router.get(
  "/alerts/:subjectId/:month/:year",
  verifyToken,
  authorizeRoles("teacher", "admin"),
  async (req, res) => {
    try {
      const { subjectId, month, year } = req.params;

      if (
        req.user.role === "teacher" &&
        !(await getTeacherSubject(subjectId, req.user.id))
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const records = await Attendance.find({
        subject: subjectId,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }).populate("student", "name rollNo email batch");

      const map = {};

      records.forEach((r) => {
        const id = r.student._id;

        if (!map[id]) {
          map[id] = {
            student: r.student,
            total: 0,
            present: 0
          };
        }

        map[id].total++;

        if (r.status === "present") {
          map[id].present++;
        }
      });

      const alerts = [];

      Object.values(map).forEach((data) => {
        const percent = (data.present / data.total) * 100;

        if (percent < 50) {
          alerts.push({
            student: data.student,
            attendance: percent.toFixed(2)
          });
        }
      });

      res.json({
        message: "Low attendance students below 50%",
        alerts
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
