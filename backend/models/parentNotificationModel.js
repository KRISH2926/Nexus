const mongoose = require("mongoose");

const parentNotificationSchema = new mongoose.Schema({
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Parent", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  type: { type: String, enum: ["gatepass-review", "attendance-alert"], required: true },
  eventId: { type: String, required: true },
  message: { type: String, required: true, maxlength: 500 },
  readAt: { type: Date, default: null },
  emailStatus: { type: String, enum: ["not_configured", "pending", "sending", "sent", "failed"], default: "not_configured" },
  emailSentAt: { type: Date, default: null }
}, { timestamps: true });

parentNotificationSchema.index({ parent: 1, createdAt: -1 });
parentNotificationSchema.index({ parent: 1, type: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model("ParentNotification", parentNotificationSchema);
