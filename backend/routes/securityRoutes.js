const express = require("express");
const router = express.Router();
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const securityController = require("../controllers/securityController");

router.get("/profile", verifyToken, authorizeRoles("security"), securityController.getProfile);
router.post("/scan/verify", verifyToken, authorizeRoles("security"), securityController.verifyGatepassQr);
router.post("/scan/exit", verifyToken, authorizeRoles("security"), securityController.confirmGatepassExit);
router.post("/scan/return", verifyToken, authorizeRoles("security"), securityController.confirmGatepassReturn);
router.get("/activity", verifyToken, authorizeRoles("security"), securityController.getGateActivity);
router.get("/admin/personnel", verifyToken, authorizeRoles("admin"), securityController.listPersonnel);
router.patch("/admin/personnel/:id", verifyToken, authorizeRoles("admin"), securityController.updatePersonnel);

module.exports = router;
