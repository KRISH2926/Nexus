const express = require("express");
const router = express.Router();

const {
  verifyToken,
  authorizeRoles
} = require("../middleware/authMiddleware");

const {
  createGatepass,
  getMentorPendingGatepass,
  approveGatepass,
  rejectGatepass,
  getStudentGatepass,
  getStudentQuota,
  issueGatepass,
  getParentPendingGatepass,
  decideGatepassByParent
} = require("../controllers/gatepassController");

// ==========================
// STUDENT
// ==========================
router.post(
  "/create",
  verifyToken,
  authorizeRoles("student"),
  createGatepass
);

router.get(
  "/student/:id",
  verifyToken,
  authorizeRoles("student"),
  getStudentGatepass
);

router.get("/quota/me", verifyToken, authorizeRoles("student"), getStudentQuota);
router.post("/:id/issue", verifyToken, authorizeRoles("student"), issueGatepass);

// ==========================
// MENTOR
// ==========================
router.get(
  "/mentor/pending",
  verifyToken,
  authorizeRoles("teacher"),
  getMentorPendingGatepass
);

router.put(
  "/mentor/approve/:id",
  verifyToken,
  authorizeRoles("teacher"),
  approveGatepass
);

router.put(
  "/mentor/reject/:id",
  verifyToken,
  authorizeRoles("teacher"),
  rejectGatepass
);

// Parent review happens inside an authenticated parent portal.
router.get(
  "/parent/pending",
  verifyToken,
  authorizeRoles("parent"),
  getParentPendingGatepass
);

router.put(
  "/parent/:id/decision",
  verifyToken,
  authorizeRoles("parent"),
  decideGatepassByParent
);

module.exports = router;
