const mongoose = require("mongoose");

const gatepassQuotaUsageSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
  issuedCount: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

gatepassQuotaUsageSchema.index({ student: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("GatepassQuotaUsage", gatepassQuotaUsageSchema);
