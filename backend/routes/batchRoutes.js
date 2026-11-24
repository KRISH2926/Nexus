const express = require("express");
const router = express.Router();
const Batch = require("../models/batchModel");
const writeAdminAudit = require("../services/adminAudit");
const {
  verifyToken,
  authorizeRoles
} = require("../middleware/authMiddleware");

// Add batch
router.post("/add", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { name, startYear, endYear } = req.body;

    const batch = new Batch({ name, startYear, endYear });
    await batch.save();
    await writeAdminAudit(req, { action: "roster.batch.created", resource: "Batch", resourceId: batch._id,
      summary: `Created batch ${batch.name}`, metadata: { name: batch.name, startYear: batch.startYear, endYear: batch.endYear } });

    res.json({ message: "Batch created", batch });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all batches
router.get("/", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const batches = await Batch.find();
    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
