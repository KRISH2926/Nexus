const express = require("express");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const controller = require("../controllers/gatepassAdminController");

const router = express.Router();
router.use(verifyToken, authorizeRoles("admin"));
router.get("/policies", controller.listPolicies);
router.post("/policies", controller.createPolicy);
router.get("/usage", controller.listUsage);
router.get("/audit", controller.listAudit);
router.get("/reports", controller.getReports);
router.get("/active", controller.listActivePasses);
router.post("/:id/revoke", controller.revokePass);
module.exports = router;
