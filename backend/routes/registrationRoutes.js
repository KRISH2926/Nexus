const express = require("express");
const router = express.Router();
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const registrationController = require("../controllers/registrationController");

router.use(verifyToken, authorizeRoles("admin"));

router.post("/student-codes", registrationController.createStudentCode);
router.get("/student-codes", registrationController.listStudentCodes);
router.patch("/student-codes/:id/revoke", registrationController.revokeStudentCode);
router.post("/invitations", registrationController.createInvitation);
router.get("/invitations", registrationController.listInvitations);
router.patch("/invitations/:id/revoke", registrationController.revokeInvitation);
router.get("/pending-accounts", registrationController.listPendingAccounts);
router.post("/pending-accounts/:role/:id/approve", registrationController.approvePendingAccount);

module.exports = router;
