const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const Teacher = require("../models/teacherModel");
const Batch = require("../models/batchModel");
const Student = require("../models/studentModel");
const Subject = require("../models/subjectModel");
const writeAdminAudit = require("../services/adminAudit");

const {
  verifyToken,
  authorizeRoles
} = require("../middleware/authMiddleware");

// ============================
// ADD TEACHER
// ============================
router.post(
  "/add",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
  try {
    const { name, email, password, mobile, batch, isMentor } = req.body;

    if (!name || !email || !password || !mobile || !batch) {
      return res.status(400).json({
        message: "Name, email, password, mobile and batch are required"
      });
    }

    const exists = await Teacher.findOne({ email });

    if (exists) {
      return res.status(400).json({
        message: "Teacher already exists"
      });
    }

    const batchExists = await Batch.findById(batch);

    if (!batchExists) {
      return res.status(404).json({
        message: "Batch not found"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const teacher = new Teacher({
      name,
      email,
      password: hashedPassword,
      mobile,
      batch,
      isMentor: isMentor || false
    });

    await teacher.save();
    await writeAdminAudit(req, { action: "roster.teacher.created", resource: "Teacher", resourceId: teacher._id,
      summary: `Created teacher ${teacher.name}`, metadata: { name: teacher.name, email: teacher.email, batch: String(teacher.batch), isMentor: teacher.isMentor } });

    const teacherResponse = teacher.toObject();
    delete teacherResponse.password;

    res.json({
      message: "Teacher created successfully",
      teacher: teacherResponse
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  }
);

// ============================
// GET ALL TEACHERS
// ============================
router.get("/", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const teachers = await Teacher.find()
      .populate("batch")
      .select("-password");

    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================
// DELETE TEACHER
// ============================
router.delete("/:id", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found"
      });
    }

    // Optional cleanup: unassign this teacher from subjects
    await Subject.updateMany(
      { teacher: req.params.id },
      { $unset: { teacher: "" } }
    );
    await writeAdminAudit(req, { action: "roster.teacher.deleted", resource: "Teacher", resourceId: teacher._id,
      summary: `Deleted teacher ${teacher.name}`, metadata: { name: teacher.name, email: teacher.email } });

    res.json({
      message: "Teacher deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================
// TEACHER DASHBOARD
// ============================
router.get(
  "/dashboard/:id",
  verifyToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      if (req.user.id !== req.params.id) {
        return res.status(403).json({
          message: "Access denied"
        });
      }

      const teacher = await Teacher.findById(req.params.id)
        .populate("batch")
        .select("-password");

      if (!teacher) {
        return res.status(404).json({
          message: "Teacher not found"
        });
      }

      res.json(teacher);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================
// STUDENTS OF TEACHER'S BATCH
// ============================
router.get(
  "/students/:id",
  verifyToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      if (req.user.id !== req.params.id) {
        return res.status(403).json({
          message: "Access denied"
        });
      }

      const teacher = await Teacher.findById(req.params.id);

      if (!teacher) {
        return res.status(404).json({
          message: "Teacher not found"
        });
      }

      const students = await Student.find({
        batch: teacher.batch
      })
        .populate("batch")
        .select("-password")
        .sort({ rollNo: 1 });

      res.json(students);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================
// SUBJECTS ASSIGNED TO TEACHER
// ============================
router.get(
  "/subjects/:id",
  verifyToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      if (req.user.id !== req.params.id) {
        return res.status(403).json({
          message: "Access denied"
        });
      }

      const subjects = await Subject.find({
        teacher: req.params.id
      })
        .populate("batch")
        .populate("teacher", "name email");

      res.json(subjects);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
