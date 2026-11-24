const express = require("express");
const rateLimit = require("../middleware/rateLimit");
const parentController = require("../controllers/parentController");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", rateLimit({ limit: 5, windowMs: 15 * 60 * 1000 }), parentController.register);
router.get("/me", verifyToken, authorizeRoles("parent"), parentController.getWorkspace);
router.post("/link-student", verifyToken, authorizeRoles("parent"), parentController.linkStudent);
router.patch("/notifications/:id/read", verifyToken, authorizeRoles("parent"), parentController.markNotificationRead);

module.exports = router;
