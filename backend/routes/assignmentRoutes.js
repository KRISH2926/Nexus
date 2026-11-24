const express = require("express");

const router = express.Router();

const {
  createAssignment,
  getStudentAssignments,
  submitAssignment,
  getAssignmentResults,
  getTeacherAssignments,
} = require("../controllers/assignmentController");

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

/* ================= ASSIGNMENT ROUTES ================= */

router.post(
  "/create",
  verifyToken,
  authorizeRoles("teacher"),
  createAssignment
);

router.get(
  "/student",
  verifyToken,
  authorizeRoles("student"),
  getStudentAssignments
);

router.get(
  "/teacher",
  verifyToken,
  authorizeRoles("teacher"),
  getTeacherAssignments
);

router.post(
  "/submit",
  verifyToken,
  authorizeRoles("student"),
  submitAssignment
);

router.get(
  "/results/:assignmentId",
  verifyToken,
  authorizeRoles("teacher"),
  getAssignmentResults
);

module.exports = router;