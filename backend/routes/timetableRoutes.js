const express = require("express");
const multer = require("multer");

const {
  verifyToken,
  authorizeRoles
} = require("../middleware/authMiddleware");
const {
  getTimetable,
  createEntry,
  updateEntry,
  deleteEntry,
  getTeacherToday,
  getStudentToday,
  getCurrentTeacherSlot,
  importTimetable
} = require("../controllers/timetableController");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get("/", verifyToken, authorizeRoles("admin"), getTimetable);
router.post("/", verifyToken, authorizeRoles("admin"), createEntry);
router.post(
  "/import",
  verifyToken,
  authorizeRoles("admin"),
  upload.single("file"),
  importTimetable
);

router.get("/teacher/:teacherId/today", verifyToken, getTeacherToday);
router.get("/student/:studentId/today", verifyToken, getStudentToday);
router.get("/teacher-current-slot", verifyToken, getCurrentTeacherSlot);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateEntry);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteEntry);

module.exports = router;
