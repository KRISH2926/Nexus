const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true, maxlength: 120 },
  resource: { type: String, required: true, maxlength: 80 },
  resourceId: { type: String, maxlength: 100 },
  summary: { type: String, required: true, maxlength: 500 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
