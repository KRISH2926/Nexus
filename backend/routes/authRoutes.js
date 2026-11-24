const express = require("express");
const router = express.Router();

const { login } = require("../controllers/authController");
const registrationController = require("../controllers/registrationController");
const rateLimit = require("../middleware/rateLimit");

router.post("/login", login);
router.get("/batch-options", registrationController.batchOptions);
router.post("/register", rateLimit({ limit: 8, windowMs: 15 * 60 * 1000 }), registrationController.register);
router.post("/verify-email", rateLimit({ limit: 12, windowMs: 15 * 60 * 1000 }), registrationController.verifyEmail);
router.post("/resend-verification", rateLimit({ limit: 5, windowMs: 15 * 60 * 1000 }), registrationController.resendVerification);

module.exports = router;