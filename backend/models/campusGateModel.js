const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  days: { type: [String], enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], default: [] }
}, { _id: true });

const campusGateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
  location: { type: String, trim: true, maxlength: 200, default: "" },
  status: { type: String, enum: ["active", "disabled"], default: "active" },
  shifts: { type: [shiftSchema], default: [] },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true }
}, { timestamps: true });

module.exports = mongoose.model("CampusGate", campusGateSchema);
