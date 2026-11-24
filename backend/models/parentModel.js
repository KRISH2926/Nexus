const mongoose = require("mongoose");

const parentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  pendingStudent: { type: mongoose.Schema.Types.ObjectId, ref: "Student", select: false },
  status: { type: String, enum: ["pending", "active", "disabled"], default: "pending" },
  emailVerified: { type: Boolean, default: false },
  emailVerificationTokenHash: { type: String, select: false },
  emailVerificationExpiresAt: { type: Date, select: false }
}, { timestamps: true });

parentSchema.index({ students: 1 });

module.exports = mongoose.model("Parent", parentSchema);
