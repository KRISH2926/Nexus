const express = require("express");
const router = express.Router();

const Notification = require("../models/notificationModel");
const {
  verifyToken,
  authorizeRoles
} = require("../middleware/authMiddleware");

// GET student notifications
router.get(
  "/student/:id",
  verifyToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      if (req.params.id !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const notifications = await Notification.find({
        student: req.user.id
      })
        .populate("subject", "name")
        .sort({ createdAt: -1 });

      res.json(notifications);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
