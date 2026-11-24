const mongoose = require("mongoose");
const GatepassPolicy = require("../models/gatepassPolicyModel");
const GatepassQuotaUsage = require("../models/gatepassQuotaUsageModel");
const AuditLog = require("../models/auditLogModel");
const GatepassScanLog = require("../models/gatepassScanLogModel");
const Gatepass = require("../models/gatepassModel");

exports.listPolicies = async (_req, res) => {
  try {
    const policies = await GatepassPolicy.find({}).sort({ scope: 1, effectiveFrom: -1 }).limit(250)
      .populate("scopeId", "name rollNo").populate("changedBy", "name email").lean();
    return res.json({ defaultMonthlyQuota: 2, policies });
  } catch {
    return res.status(500).json({ message: "Could not load gatepass policies" });
  }
};

exports.createPolicy = async (req, res) => {
  const { scope = "global", scopeId = null, monthlyQuota, effectiveFrom, effectiveUntil, reason } = req.body || {};
  if (!["global", "batch", "student"].includes(scope) || !Number.isInteger(monthlyQuota) || monthlyQuota < 0 || monthlyQuota > 31 ||
      (scope === "global" && scopeId) || (scope !== "global" && !mongoose.Types.ObjectId.isValid(scopeId)) ||
      (reason !== undefined && (typeof reason !== "string" || reason.trim().length < 3 || reason.length > 300))) {
    return res.status(400).json({ message: "Choose a valid scope, quota, and reason for the audited policy change" });
  }
  const starts = effectiveFrom ? new Date(effectiveFrom) : new Date();
  const ends = effectiveUntil ? new Date(effectiveUntil) : null;
  if (Number.isNaN(starts.getTime()) || (ends && (Number.isNaN(ends.getTime()) || ends <= starts))) {
    return res.status(400).json({ message: "Policy dates are invalid" });
  }
  try {
    const policy = await GatepassPolicy.create({ scope, scopeId, scopeModel: scope === "global" ? null : scope === "batch" ? "Batch" : "Student", monthlyQuota, effectiveFrom: starts,
      effectiveUntil: ends, reason: reason?.trim() || "Admin quota policy update", changedBy: req.user.id });
    await AuditLog.create({ actor: req.user.id, actorRole: "admin", action: "gatepass.policy.created", resource: "GatepassPolicy",
      resourceId: String(policy._id), summary: `Set ${scope} monthly gatepass quota to ${monthlyQuota}`,
      metadata: { scope, scopeId: scopeId ? String(scopeId) : null, monthlyQuota, effectiveFrom: starts, effectiveUntil: ends, reason: reason?.trim() || "Admin quota policy update" } });
    return res.status(201).json({ message: "Quota policy saved and recorded in the audit log", policy });
  } catch {
    return res.status(500).json({ message: "Could not save gatepass policy" });
  }
};

exports.listUsage = async (req, res) => {
  const month = req.query.month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: "Month must use YYYY-MM format" });
  try {
    const usage = await GatepassQuotaUsage.find({ month }).populate("student", "name rollNo batch").lean();
    return res.json({ month, usage: usage.map((entry) => ({ student: entry.student, issued: entry.issuedCount })) });
  } catch {
    return res.status(500).json({ message: "Could not load gatepass quota usage" });
  }
};

exports.listAudit = async (_req, res) => {
  try {
    const entries = await AuditLog.find({}).sort({ createdAt: -1 }).limit(100).populate("actor", "name email").lean();
    return res.json({ entries });
  } catch {
    return res.status(500).json({ message: "Could not load audit history" });
  }
};

exports.getReports = async (_req, res) => {
  try {
    const statuses = ["pending", "parent_pending", "approved", "issued", "exited", "returned", "rejected", "expired", "revoked"];
    const [counts, scans, usage] = await Promise.all([
      Promise.all(statuses.map(async (status) => [status, await Gatepass.countDocuments({ status })])),
      GatepassScanLog.find({}).sort({ createdAt: -1 }).limit(100)
        .populate("student", "name rollNo").select("action result gate scanReference reasonCode createdAt student").lean(),
      GatepassQuotaUsage.find({ month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}` })
        .populate("student", "name rollNo batch").lean()
    ]);
    return res.json({ statusCounts: Object.fromEntries(counts), recentScans: scans,
      monthlyUsage: usage.map((row) => ({ student: row.student, issued: row.issuedCount })) });
  } catch {
    return res.status(500).json({ message: "Could not load gatepass reports" });
  }
};

exports.listActivePasses = async (_req, res) => {
  try {
    const passes = await Gatepass.find({ status: { $in: ["approved", "issued"] } })
      .sort({ createdAt: -1 }).limit(100)
      .populate("student", "name rollNo batch").populate("student.batch", "name")
      .select("student reason date exitTime expectedReturnTime status expiresAt issuedAt createdAt").lean();
    return res.json({ gatepasses: passes });
  } catch {
    return res.status(500).json({ message: "Could not load active gatepasses" });
  }
};

exports.revokePass = async (req, res) => {
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (reason.length < 3 || reason.length > 300) return res.status(400).json({ message: "A revocation reason between 3 and 300 characters is required" });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid gatepass id" });
  try {
    const gatepass = await Gatepass.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ["approved", "issued"] }, exitRecord: { $exists: false } },
      { $set: { status: "revoked" }, $unset: { qrTokenHash: 1 } }, { new: true }
    );
    if (!gatepass) return res.status(409).json({ message: "This pass is already used, finalised, or unavailable for revocation" });
    await AuditLog.create({ actor: req.user.id, actorRole: "admin", action: "gatepass.pass.revoked", resource: "Gatepass",
      resourceId: String(gatepass._id), summary: "Revoked an unused gatepass", metadata: { reason } });
    return res.json({ message: "Gatepass revoked and recorded in the audit log", gatepass: { id: String(gatepass._id), status: gatepass.status } });
  } catch {
    return res.status(500).json({ message: "Could not revoke the gatepass" });
  }
};
