const express = require("express");
const router = express.Router();

const Subject = require("../models/subjectModel");
const Batch = require("../models/batchModel");
const Teacher = require("../models/teacherModel");
const writeAdminAudit = require("../services/adminAudit");
const {
  verifyToken,
  authorizeRoles
} = require("../middleware/authMiddleware");

// ===============================
// ADD SUBJECT (SAFE VERSION)
// ===============================
router.post("/add", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { name, batch, teacher } = req.body;

    // validation
    if (!name || !batch) {
      return res.status(400).json({
        message: "Subject name and batch are required"
      });
    }

    // check batch exists
    const batchExists = await Batch.findById(batch);
    if (!batchExists) {
      return res.status(404).json({ message: "Batch not found" });
    }

    // check teacher if provided
    if (teacher) {
      const teacherExists = await Teacher.findById(teacher);
      if (!teacherExists) {
        return res.status(404).json({ message: "Teacher not found" });
      }
    }

    const subject = new Subject({
      name,
      batch,
      teacher
    });

    await subject.save();
    await writeAdminAudit(req, { action: "roster.subject.created", resource: "Subject", resourceId: subject._id,
      summary: `Created subject ${subject.name}`, metadata: { name: subject.name, batch: String(subject.batch), teacher: subject.teacher ? String(subject.teacher) : null } });

    res.json({
      message: "Subject added successfully",
      subject
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ===============================
// GET ALL SUBJECTS
// ===============================
router.get("/", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const subjects = await Subject.find()
      .populate("batch")
      .populate("teacher", "name email mobile batch isMentor");

    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
