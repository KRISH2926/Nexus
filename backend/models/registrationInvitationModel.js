const mongoose = require("mongoose");

const registrationInvitationSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, select: false },
    role: { type: String, enum: ["teacher", "security"], required: true },
    invitedEmail: { type: String, lowercase: true, trim: true },
    expiresAt: { type: Date, required: true },
    redeemedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("RegistrationInvitation", registrationInvitationSchema);
