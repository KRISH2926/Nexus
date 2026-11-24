const mongoose = require("mongoose");

const registrationCodeSchema = new mongoose.Schema(
  {
    codeHash: { type: String, required: true, unique: true, select: false },
    type: { type: String, enum: ["individual", "batch"], required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    rollNo: { type: String, trim: true },
    maxRedemptions: { type: Number, required: true, min: 1 },
    redemptionCount: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("RegistrationCode", registrationCodeSchema);
