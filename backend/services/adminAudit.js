const AuditLog = require("../models/auditLogModel");

module.exports = function writeAdminAudit(req, { action, resource, resourceId, summary, metadata = {} }) {
  return AuditLog.create({
    actor: req.user.id,
    actorRole: "admin",
    action,
    resource,
    resourceId: resourceId ? String(resourceId) : undefined,
    summary,
    metadata
  });
};
