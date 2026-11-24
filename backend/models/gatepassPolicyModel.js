const mongoose = require("mongoose");

const gatepassPolicySchema = new mongoose.Schema({
  scope: { type: String, enum: ["global", "batch", "student"], required: true },
  scopeId: { type: mongoose.Schema.Types.ObjectId, refPath: "scopeModel", default: null },
  scopeModel: { type: String, enum: ["Batch", "Student", null], default: null },
  monthlyQuota: { type: Number, required: true, min: 0, max: 31 },
  effectiveFrom: { type: Date, default: Date.now },
  effectiveUntil: { type: Date, default: null },
  reason: { type: String, trim: true, maxlength: 300 },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true }
}, { timestamps: true });

gatepassPolicySchema.index({ scope: 1, scopeId: 1, effectiveFrom: -1 });

module.exports = mongoose.model("GatepassPolicy", gatepassPolicySchema);
