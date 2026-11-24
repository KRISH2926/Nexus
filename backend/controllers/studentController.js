const Student = require("../models/studentModel");
const Attendance = require("../models/attendanceModel");

// 📊 STUDENT DASHBOARD DATA
exports.getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.params.id;

    // 1. Get student details
    const student = await Student.findById(studentId)
      .populate("batch");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 2. Get attendance records
    const attendance = await Attendance.find({ student: studentId })
      .populate("subject");

    // 3. Subject-wise grouping
    const subjectMap = {};

    attendance.forEach((record) => {
      const subjectId = record.subject._id.toString();

      if (!subjectMap[subjectId]) {
        subjectMap[subjectId] = {
          subject: record.subject.name || record.subject,
          total: 0,
          present: 0,
          absent: 0
        };
      }

      subjectMap[subjectId].total++;

      if (record.status === "present") {
        subjectMap[subjectId].present++;
      } else {
        subjectMap[subjectId].absent++;
      }
    });

    const subjectWiseAttendance = Object.values(subjectMap).map((sub) => ({
      ...sub,
      percentage:
        sub.total === 0
          ? 0
          : ((sub.present / sub.total) * 100).toFixed(2)
    }));

    // 4. Response
    res.json({
      name: student.name,
      rollNo: student.rollNo,
      batch: student.batch,
      attendance: subjectWiseAttendance
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};