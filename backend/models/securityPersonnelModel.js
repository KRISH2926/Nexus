const mongoose = require("mongoose");

const securityPersonnelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    mobile: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, "Enter valid Indian mobile number"]
    },
    employeeId: { type: String, required: true, unique: true, trim: true },
    assignedGate: { type: String, required: true, trim: true },
    assignedShift: { type: String, trim: true, default: "Day" },
    status: { type: String, enum: ["pending", "active", "disabled"] },
    emailVerified: { type: Boolean },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SecurityPersonnel", securityPersonnelSchema);
