const SecurityPersonnel = require("../models/securityPersonnelModel");
const Gatepass = require("../models/gatepassModel");
const GatepassScanLog = require("../models/gatepassScanLogModel");
const crypto = require("crypto");
const mongoose = require("mongoose");
const AuditLog = require("../models/auditLogModel");
const CampusGate = require("../models/campusGateModel");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const scanReference = () => crypto.randomUUID();
const safeStudentFields = "name rollNo batch";

async function getSecurity(req) {
  return SecurityPersonnel.findOne({ _id: req.user.id, status: "active" }).select("assignedGate");
}

async function logScan(security, action, result, gatepass, reasonCode) {
  await GatepassScanLog.create({
    action, result, gatepass: gatepass?._id, student: gatepass?.student?._id || gatepass?.student,
    security: security._id, gate: security.assignedGate, scanReference: scanReference(), reasonCode
  });
}

async function resolvePass(token) {
  if (typeof token !== "string" || token.length < 32 || token.length > 128) return null;
  return Gatepass.findOne({ qrTokenHash: hashToken(token) })
    .select("+qrTokenHash student mentor date reason details exitTime expectedReturnTime status expiresAt issuedAt exitRecord returnRecord")
    .populate("student", safeStudentFields)
    .populate("student.batch", "name");
}

exports.getProfile = async (req, res) => {
  try {
    const personnel = await SecurityPersonnel.findById(req.user.id)
      .select("name email employeeId assignedGate assignedShift status")
      .lean();
    if (!personnel) return res.status(404).json({ message: "Security account not found" });
    return res.json({
      id: String(personnel._id),
      name: personnel.name,
      email: personnel.email,
      employeeId: personnel.employeeId,
      assignedGate: personnel.assignedGate,
      assignedShift: personnel.assignedShift || "Day",
      accountStatus: personnel.status || "active"
    });
  } catch {
    return res.status(500).json({ message: "Could not load the security profile" });
  }
};

exports.verifyGatepassQr = async (req, res) => {
  const security = await getSecurity(req);
  if (!security) return res.status(403).json({ message: "Active security profile required" });
  try {
    const gatepass = await resolvePass(req.body?.token);
    if (!gatepass) {
      await logScan(security, "verify", "invalid", null, "token_not_found");
      return res.status(404).json({ valid: false, message: "This QR pass is not valid" });
    }
    if (!gatepass.expiresAt || gatepass.expiresAt <= new Date()) {
      await Gatepass.updateOne({ _id: gatepass._id, status: "issued" }, { $set: { status: "expired" }, $unset: { qrTokenHash: 1 } });
      await logScan(security, "verify", "expired", gatepass, "expired");
      return res.status(410).json({ valid: false, message: "This pass has expired" });
    }
    if (!["issued", "exited"].includes(gatepass.status)) {
      const replay = gatepass.status === "returned";
      await logScan(security, "verify", replay ? "replayed" : "invalid", gatepass, gatepass.status);
      return res.status(409).json({ valid: false, message: replay ? "This pass has completed its exit and return" : "This pass is not active" });
    }
    await logScan(security, "verify", "valid", gatepass);
    return res.json({ valid: true, message: "Pass verified. Confirm the student's identity before recording exit.", pass: {
      id: String(gatepass._id), student: gatepass.student?.name, rollNo: gatepass.student?.rollNo,
      batch: gatepass.student?.batch?.name, reason: gatepass.reason, details: gatepass.details,
      date: gatepass.date, exitTime: gatepass.exitTime, expectedReturnTime: gatepass.expectedReturnTime, expiresAt: gatepass.expiresAt,
      nextAction: gatepass.status === "exited" ? "return" : "exit"
    } });
  } catch {
    return res.status(500).json({ message: "Could not verify this pass" });
  }
};

exports.confirmGatepassExit = async (req, res) => {
  const security = await getSecurity(req);
  if (!security) return res.status(403).json({ message: "Active security profile required" });
  try {
    const gatepass = await resolvePass(req.body?.token);
    if (!gatepass) {
      await logScan(security, "exit", "invalid", null, "token_not_found");
      return res.status(404).json({ message: "This QR pass is not valid" });
    }
    const now = new Date();
    if (!gatepass.expiresAt || gatepass.expiresAt <= now) {
      await Gatepass.updateOne({ _id: gatepass._id, status: "issued" }, { $set: { status: "expired" }, $unset: { qrTokenHash: 1 } });
      await logScan(security, "exit", "expired", gatepass, "expired");
      return res.status(410).json({ message: "This pass has expired" });
    }
    const reference = scanReference();
    const exited = await Gatepass.findOneAndUpdate(
      { _id: gatepass._id, status: "issued", qrTokenHash: gatepass.qrTokenHash, expiresAt: { $gt: now } },
      { $set: { status: "exited", exitRecord: { security: security._id, gate: security.assignedGate, scannedAt: now, scanReference: reference } } },
      { new: true }
    );
    if (!exited) {
      await logScan(security, "exit", "replayed", gatepass, "already_used_or_changed");
      return res.status(409).json({ message: "This pass was already used or changed. No exit was recorded." });
    }
    await GatepassScanLog.create({ action: "exit", result: "valid", gatepass: exited._id, student: gatepass.student?._id,
      security: security._id, gate: security.assignedGate, scanReference: reference });
    return res.json({ message: "Exit recorded", scanReference: reference, status: exited.status });
  } catch {
    return res.status(500).json({ message: "Could not record exit" });
  }
};

exports.confirmGatepassReturn = async (req, res) => {
  const security = await getSecurity(req);
  if (!security) return res.status(403).json({ message: "Active security profile required" });
  try {
    const gatepass = await resolvePass(req.body?.token);
    if (!gatepass) {
      await logScan(security, "return", "invalid", null, "token_not_found");
      return res.status(404).json({ message: "This QR pass is not valid" });
    }
    const now = new Date();
    if (!gatepass.expiresAt || gatepass.expiresAt <= now) {
      await logScan(security, "return", "expired", gatepass, "expired");
      return res.status(410).json({ message: "This pass has expired" });
    }
    const reference = scanReference();
    const returned = await Gatepass.findOneAndUpdate(
      { _id: gatepass._id, status: "exited", qrTokenHash: gatepass.qrTokenHash },
      { $set: { status: "returned", returnRecord: { security: security._id, gate: security.assignedGate, scannedAt: now, scanReference: reference } } },
      { new: true }
    );
    if (!returned) {
      const result = gatepass.status === "returned" ? "replayed" : "invalid";
      await logScan(security, "return", result, gatepass, gatepass.status);
      return res.status(409).json({ message: result === "replayed" ? "Return has already been recorded" : "This student has no recorded exit for this pass" });
    }
    await GatepassScanLog.create({ action: "return", result: "valid", gatepass: returned._id, student: gatepass.student?._id,
      security: security._id, gate: security.assignedGate, scanReference: reference });
    return res.json({ message: "Return recorded", scanReference: reference, status: returned.status });
  } catch {
    return res.status(500).json({ message: "Could not record return" });
  }
};

exports.getGateActivity = async (req, res) => {
  const security = await getSecurity(req);
  if (!security) return res.status(403).json({ message: "Active security profile required" });
  try {
    const events = await GatepassScanLog.find({ security: security._id }).sort({ createdAt: -1 }).limit(100)
      .populate("student", "name rollNo").select("action result gate scanReference reasonCode createdAt student").lean();
    return res.json({ events });
  } catch {
    return res.status(500).json({ message: "Could not load gate activity" });
  }
};

exports.listPersonnel = async (_req, res) => {
  try {
    const personnel = await SecurityPersonnel.find({}).select("name email employeeId assignedGate assignedShift status createdAt")
      .sort({ name: 1 }).lean();
    return res.json({ personnel });
  } catch {
    return res.status(500).json({ message: "Could not load security personnel" });
  }
};

exports.updatePersonnel = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid security account" });
  const assignedGate = typeof req.body?.assignedGate === "string" ? req.body.assignedGate.trim() : "";
  const assignedShift = typeof req.body?.assignedShift === "string" ? req.body.assignedShift.trim() : "";
  const status = req.body?.status;
  if (!assignedGate || assignedGate.length > 100 || !assignedShift || assignedShift.length > 60 || !["active", "disabled"].includes(status)) {
    return res.status(400).json({ message: "A valid gate, shift, and active or disabled status are required" });
  }
  try {
    const gate = await CampusGate.findOne({ name: assignedGate, status: "active" });
    if (!gate) return res.status(400).json({ message: "Choose an active campus gate" });
    if (!gate.shifts.some((shift) => shift.name === assignedShift)) return res.status(400).json({ message: "Choose a shift configured for this gate" });
    const personnel = await SecurityPersonnel.findById(req.params.id).select("name email employeeId assignedGate assignedShift status");
    if (!personnel) return res.status(404).json({ message: "Security account not found" });
    const previous = { assignedGate: personnel.assignedGate, assignedShift: personnel.assignedShift || "Day", status: personnel.status };
    personnel.assignedGate = assignedGate;
    personnel.assignedShift = assignedShift;
    personnel.status = status;
    await personnel.save();
    await AuditLog.create({ actor: req.user.id, actorRole: "admin", action: "security.personnel.updated", resource: "SecurityPersonnel",
      resourceId: String(personnel._id), summary: `Updated gate assignment for ${personnel.name}`,
      metadata: { previous, next: { assignedGate, assignedShift, status } } });
    return res.json({ message: "Security assignment updated and audited", personnel: {
      id: String(personnel._id), name: personnel.name, email: personnel.email,
      employeeId: personnel.employeeId, assignedGate: personnel.assignedGate, assignedShift: personnel.assignedShift, status: personnel.status
    } });
  } catch {
    return res.status(500).json({ message: "Could not update security assignment" });
  }
};
