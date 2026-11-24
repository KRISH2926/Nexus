const mongoose = require("mongoose");
const CampusGate = require("../models/campusGateModel");
const SecurityPersonnel = require("../models/securityPersonnelModel");
const writeAdminAudit = require("../services/adminAudit");

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const validTime = (value) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const normalizeShifts = (shifts) => {
  if (!Array.isArray(shifts) || shifts.length > 12) return null;
  const names = new Set();
  const clean = [];
  for (const shift of shifts) {
    const name = typeof shift?.name === "string" ? shift.name.trim() : "";
    const days = Array.isArray(shift?.days) ? [...new Set(shift.days)] : [];
    if (!name || name.length > 60 || names.has(name.toLowerCase())) return null;
    if (!validTime(shift.startTime) || !validTime(shift.endTime) || shift.startTime === shift.endTime) return null;
    if (days.some((day) => !WEEKDAYS.includes(day))) return null;
    names.add(name.toLowerCase());
    clean.push({ name, startTime: shift.startTime, endTime: shift.endTime, days });
  }
  return clean;
};

exports.listGates = async (_req, res) => {
  try {
    const gates = await CampusGate.find({}).sort({ name: 1 }).lean();
    return res.json({ gates });
  } catch {
    return res.status(500).json({ message: "Could not load campus gates" });
  }
};

exports.createGate = async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const location = typeof req.body?.location === "string" ? req.body.location.trim() : "";
  const shifts = normalizeShifts(req.body?.shifts || []);
  if (!name || name.length > 100 || location.length > 200 || !shifts) {
    return res.status(400).json({ message: "Provide a gate name, valid location, and valid distinct shift times and days" });
  }
  try {
    const gate = await CampusGate.create({ name, location, shifts, changedBy: req.user.id });
    await writeAdminAudit(req, { action: "campus.gate.created", resource: "CampusGate", resourceId: gate._id,
      summary: `Created campus gate ${name}`, metadata: { name, location, shifts } });
    return res.status(201).json({ message: "Gate created and audited", gate });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "A gate with this name already exists" });
    return res.status(500).json({ message: "Could not create campus gate" });
  }
};

exports.updateGate = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid gate id" });
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const location = typeof req.body?.location === "string" ? req.body.location.trim() : "";
  const status = req.body?.status;
  const shifts = normalizeShifts(req.body?.shifts);
  if (!name || name.length > 100 || location.length > 200 || !["active", "disabled"].includes(status) || !shifts) {
    return res.status(400).json({ message: "Provide a gate name, valid location, status, and valid shifts" });
  }
  try {
    const gate = await CampusGate.findById(req.params.id);
    if (!gate) return res.status(404).json({ message: "Gate not found" });
    const previous = { name: gate.name, location: gate.location, status: gate.status, shifts: gate.shifts.map((shift) => shift.toObject()) };
    const assignedStaff = await SecurityPersonnel.find({ assignedGate: gate.name }).select("assignedShift").lean();
    if (assignedStaff.some((person) => !shifts.some((shift) => shift.name === (person.assignedShift || "Day")))) {
      return res.status(409).json({ message: "Keep each assigned staff shift or reassign staff before removing it" });
    }
    if (status === "disabled") {
      const staffed = await SecurityPersonnel.exists({ assignedGate: gate.name, status: "active" });
      if (staffed) return res.status(409).json({ message: "Reassign or disable active staff before disabling this gate" });
    }
    gate.name = name; gate.location = location; gate.status = status; gate.shifts = shifts; gate.changedBy = req.user.id;
    await gate.save();
    await SecurityPersonnel.updateMany({ assignedGate: previous.name }, { $set: { assignedGate: name } });
    await writeAdminAudit(req, { action: "campus.gate.updated", resource: "CampusGate", resourceId: gate._id,
      summary: `Updated campus gate ${name}`, metadata: { previous, next: { name, location, status, shifts } } });
    return res.json({ message: "Gate settings saved and audited", gate });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "A gate with this name already exists" });
    return res.status(500).json({ message: "Could not update campus gate" });
  }
};

exports.validShift = (shifts, shiftName) => Array.isArray(shifts) && shifts.some((shift) => shift.name === shiftName);
