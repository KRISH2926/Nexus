const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const Student = require("../models/studentModel");
const writeAdminAudit = require("../services/adminAudit");
const { getStudentDashboard } = require("../controllers/studentController");
const {
  verifyToken,
  authorizeRoles
} = require("../middleware/authMiddleware");

/* ===========================
   ADD STUDENT (ADMIN ONLY)
=========================== */
router.post("/add", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = new Student({
      ...req.body,
      password: hashedPassword
    });

    await student.save();
    await writeAdminAudit(req, { action: "roster.student.created", resource: "Student", resourceId: student._id,
      summary: `Created student ${student.name}`, metadata: { name: student.name, rollNo: student.rollNo, email: student.email, batch: String(student.batch) } });

    const studentResponse = student.toObject();
    delete studentResponse.password;

    res.json({
      message: "Student added successfully",
      student: studentResponse
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ===========================
   GET ALL STUDENTS
=========================== */
router.get("/", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const students = await Student.find()
      .populate("batch")
      .select("-password");

    res.json(students);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ===========================
   DELETE STUDENT
=========================== */
router.delete("/:id", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    await writeAdminAudit(req, { action: "roster.student.deleted", resource: "Student", resourceId: student._id,
      summary: `Deleted student ${student.name}`, metadata: { name: student.name, rollNo: student.rollNo, email: student.email } });

    res.json({
      message: "Student deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ===========================
   STUDENT DASHBOARD (NEW)
=========================== */
router.get(
  "/dashboard/:id",
  verifyToken,
  authorizeRoles("student"),
  (req, res, next) => {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  },
  getStudentDashboard
);

module.exports = router;
