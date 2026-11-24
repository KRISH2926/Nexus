const express = require("express");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const controller = require("../controllers/campusGateController");

const router = express.Router();
router.use(verifyToken, authorizeRoles("admin"));
router.get("/", controller.listGates);
router.post("/", controller.createGate);
router.patch("/:id", controller.updateGate);
module.exports = router;
