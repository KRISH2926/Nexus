const mongoose = require("mongoose");

const gatepassScanLogSchema = new mongoose.Schema({
  action: { type: String, enum: ["verify", "exit", "return"], required: true },
  result: { type: String, enum: ["valid", "invalid", "expired", "replayed", "failed"], required: true },
  gatepass: { type: mongoose.Schema.Types.ObjectId, ref: "Gatepass" },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  security: { type: mongoose.Schema.Types.ObjectId, ref: "SecurityPersonnel", required: true },
  gate: { type: String, trim: true, maxlength: 100 },
  scanReference: { type: String, required: true, unique: true },
  reasonCode: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model("GatepassScanLog", gatepassScanLogSchema);
