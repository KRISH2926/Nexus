const Gatepass = require("../models/gatepassModel");
const mongoose = require("mongoose");
const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const Parent = require("../models/parentModel");
const parentNotifications = require("../services/parentNotifications");
const crypto = require("crypto");
const { getMonthlyQuota, getUsage, reserveIssuedPass, releaseReservedPass } = require("../services/gatepassQuota");

const hashQrToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const minutes = (value) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ""));
  return match ? Number(match[1]) * 60 + Number(match[2]) : -1;
};

// ==========================
// STUDENT: CREATE REQUEST
// ==========================
exports.createGatepass = async (req, res) => {
  try {
    const { reason, date, exitTime = "09:00", expectedReturnTime = "17:00", details = "" } = req.body;

    if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 200 || !date ||
        typeof details !== "string" || details.length > 500 || minutes(exitTime) < 0 ||
        minutes(expectedReturnTime) <= minutes(exitTime)) {
      return res.status(400).json({
        message: "Provide a valid reason, date, exit time, and later expected return time"
      });
    }

    const student = await Student.findById(req.user.id);

    if (!student) {
      return res.status(404).json({
        message: "Student not found"
      });
    }
    if (student.status === "pending" || student.status === "disabled") {
      return res.status(403).json({ message: "An active student account is required" });
    }

    const mentor = await Teacher.findOne({
      batch: student.batch,
      isMentor: true
    });

    if (!mentor) {
      return res.status(404).json({
        message: "Mentor not assigned for this batch"
      });
    }

    const selectedDate = new Date(date);
    if (Number.isNaN(selectedDate.getTime())) return res.status(400).json({ message: "A valid gatepass date is required" });
    selectedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const latestAllowedDate = new Date(today);
    latestAllowedDate.setDate(latestAllowedDate.getDate() + 30);
    if (selectedDate < today || selectedDate > latestAllowedDate) {
      return res.status(400).json({ message: "Choose a date from today through the next 30 days" });
    }

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const alreadyRequested = await Gatepass.findOne({
      student: student._id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (alreadyRequested) {
      return res.status(400).json({
        message: "You can request only one gatepass per day"
      });
    }

    const gatepass = await Gatepass.create({
      student: student._id,
      mentor: mentor._id,
      reason,
      date: selectedDate,
      exitTime,
      expectedReturnTime,
      details: details.trim(),
      status: "pending"
    });

    await gatepass.populate("mentor", "name email");

    res.status(201).json({
      message: "Gatepass sent to mentor",
      gatepass
    });
  } catch (err) {
    res.status(500).json({
      message: "Gatepass request failed",
      error: err.message
    });
  }
};

exports.getStudentQuota = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("_id batch");
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.status === "pending" || student.status === "disabled") return res.status(403).json({ message: "An active student account is required" });
    const [quota, usage] = await Promise.all([getMonthlyQuota(student), getUsage(student._id)]);
    return res.json({ month: usage.month, quota, issued: usage.issuedCount, remaining: Math.max(0, quota - usage.issuedCount) });
  } catch {
    return res.status(500).json({ message: "Could not load monthly gatepass quota" });
  }
};

exports.issueGatepass = async (req, res) => {
  let reserved = false;
  let month;
  try {
    const gatepass = await Gatepass.findOne({ _id: req.params.id, student: req.user.id });
    if (!gatepass) return res.status(404).json({ message: "Gatepass not found" });
    if (gatepass.status === "issued") {
      if (!gatepass.expiresAt || gatepass.expiresAt <= new Date()) {
        await Gatepass.updateOne({ _id: gatepass._id, status: "issued" }, { $set: { status: "expired" }, $unset: { qrTokenHash: 1 } });
        return res.status(410).json({ message: "This gatepass has expired" });
      }
      const token = crypto.randomBytes(32).toString("base64url");
      const rotated = await Gatepass.findOneAndUpdate(
        { _id: gatepass._id, student: req.user.id, status: "issued", expiresAt: { $gt: new Date() } },
        { $set: { qrTokenHash: hashQrToken(token) } }, { new: true }
      );
      return res.json({ message: "A fresh one-use display token is ready", gatepass: rotated, qrToken: token });
    }
    if (gatepass.status !== "approved" || gatepass.parentDecision?.decision !== "approved") {
      return res.status(409).json({ message: "Teacher and parent approval are required before pass issuance" });
    }
    const student = await Student.findById(req.user.id).select("_id batch");
    if (!student) return res.status(404).json({ message: "Student not found" });
    const [quota, usage] = await Promise.all([getMonthlyQuota(student), getUsage(student._id)]);
    month = usage.month;
    reserved = await reserveIssuedPass(student._id, month, quota);
    if (!reserved) return res.status(409).json({ message: `Monthly quota reached (${usage.issuedCount}/${quota})` });
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(gatepass.date);
    expiresAt.setHours(23, 59, 59, 999);
    expiresAt.setDate(expiresAt.getDate() + 1);
    if (expiresAt <= new Date()) {
      await releaseReservedPass(student._id, month);
      reserved = false;
      await Gatepass.updateOne({ _id: gatepass._id, status: "approved" }, { $set: { status: "expired" } });
      return res.status(410).json({ message: "The requested gatepass date has passed" });
    }
    const issued = await Gatepass.findOneAndUpdate(
      { _id: gatepass._id, student: req.user.id, status: "approved", "parentDecision.decision": "approved" },
      { $set: { status: "issued", issuedAt: new Date(), expiresAt, qrTokenHash: hashQrToken(token), quotaMonth: month } },
      { new: true }
    );
    if (!issued) {
      await releaseReservedPass(student._id, month);
      reserved = false;
      return res.status(409).json({ message: "This gatepass changed before it could be issued" });
    }
    return res.status(201).json({ message: "Gatepass issued", gatepass: issued, qrToken: token, quota: { month, issued: usage.issuedCount + 1, limit: quota, remaining: Math.max(0, quota - usage.issuedCount - 1) } });
  } catch {
    if (reserved && month) await releaseReservedPass(req.user.id, month).catch(() => {});
    return res.status(500).json({ message: "Could not issue the gatepass" });
  }
};

// ==========================
// STUDENT: VIEW OWN REQUESTS
// ==========================
exports.getStudentGatepass = async (req, res) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const data = await Gatepass.find({
      student: req.user.id
    })
      .populate("mentor", "name email")
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch student gatepasses",
      error: err.message
    });
  }
};

// ==========================
// MENTOR: PENDING REQUESTS
// ==========================
exports.getMentorPendingGatepass = async (req, res) => {
  try {
    const mentorId = req.user.id;

    const data = await Gatepass.find({
      mentor: mentorId,
      status: "pending"
    })
      .populate("student", "name rollNo batch")
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch pending gatepasses",
      error: err.message
    });
  }
};

// ==========================
// APPROVE
// ==========================
exports.approveGatepass = async (req, res) => {
  try {
    const gatepass = await Gatepass.findById(req.params.id);

    if (!gatepass) {
      return res.status(404).json({
        message: "Gatepass not found"
      });
    }

    if (gatepass.mentor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (gatepass.status !== "pending") {
      return res.status(409).json({ message: "Gatepass is no longer pending" });
    }

    const verifiedParent = await Parent.exists({
      students: gatepass.student,
      status: "active",
      emailVerified: true
    });
    if (!verifiedParent) {
      return res.status(409).json({
        message: "A verified parent portal account must be linked before this request can be approved"
      });
    }

    const updatedGatepass = await Gatepass.findOneAndUpdate(
      { _id: gatepass._id, mentor: req.user.id, status: "pending" },
      { $set: { status: "parent_pending", teacherDecisionAt: new Date() } },
      { new: true }
    );

    if (!updatedGatepass) {
      return res.status(409).json({ message: "Gatepass is no longer pending" });
    }

    const delivery = await parentNotifications.notifyParents({
      studentId: gatepass.student,
      type: "gatepass-review",
      eventId: String(gatepass._id),
      message: "A gatepass request has been approved by campus staff and is waiting for your decision in NEXUS."
    });

    res.json({
      message: "Campus approved the request. It is waiting for parent review.",
      gatepass: updatedGatepass,
      parentNotification: {
        status: delivery.status,
        emailConfigured: delivery.emailConfigured,
        emailSent: delivery.emailSent,
        emailFailed: delivery.emailFailed
      }
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to approve gatepass",
      error: err.message
    });
  }
};

// ==========================
// PARENT: REVIEW TEACHER-APPROVED REQUESTS
// ==========================
exports.getParentPendingGatepass = async (req, res) => {
  try {
    const parent = await Parent.findOne({
      _id: req.user.id,
      status: "active",
      emailVerified: true
    }).select("students");
    if (!parent) return res.status(403).json({ message: "Parent account is not active" });

    const requests = await Gatepass.find({
      student: { $in: parent.students },
      status: "parent_pending"
    })
      .populate("student", "name rollNo")
      .populate("mentor", "name")
      .sort({ createdAt: -1 });
    return res.json({ gatepasses: requests });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load parent gatepass requests", error: err.message });
  }
};

exports.decideGatepassByParent = async (req, res) => {
  try {
    const decision = req.body?.decision;
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ message: "Decision must be approved or rejected" });
    }
    const parent = await Parent.findOne({
      _id: req.user.id,
      status: "active",
      emailVerified: true
    }).select("students");
    if (!parent) return res.status(403).json({ message: "Parent account is not active" });

    const updatedGatepass = await Gatepass.findOneAndUpdate(
      {
        _id: req.params.id,
        student: { $in: parent.students },
        status: "parent_pending"
      },
      {
        $set: {
          status: decision,
          parentDecision: { parent: parent._id, decision, decidedAt: new Date() }
        }
      },
      { new: true }
    );
    if (!updatedGatepass) {
      return res.status(404).json({ message: "An eligible request was not found for your linked students" });
    }
    return res.json({
      message: decision === "approved" ? "Parent approval recorded" : "Parent rejection recorded",
      gatepass: updatedGatepass
    });
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: "Invalid gatepass request" });
    }
    return res.status(500).json({ message: "Failed to record parent decision", error: err.message });
  }
};

// ==========================
// REJECT
// ==========================
exports.rejectGatepass = async (req, res) => {
  try {
    const gatepass = await Gatepass.findById(req.params.id);

    if (!gatepass) {
      return res.status(404).json({
        message: "Gatepass not found"
      });
    }

    if (gatepass.mentor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (gatepass.status !== "pending") {
      return res.status(409).json({ message: "Gatepass is no longer pending" });
    }

    const updatedGatepass = await Gatepass.findOneAndUpdate(
      { _id: gatepass._id, mentor: req.user.id, status: "pending" },
      { $set: { status: "rejected" } },
      { new: true }
    );

    if (!updatedGatepass) {
      return res.status(409).json({ message: "Gatepass is no longer pending" });
    }

    const delivery = await parentNotifications.notifyParents({
      studentId: gatepass.student,
      type: "gatepass-review",
      eventId: `${gatepass._id}-teacher-rejected`,
      message: "A gatepass request was declined by campus staff. Open NEXUS to review its status."
    });

    res.json({
      message: "Gatepass rejected",
      gatepass: updatedGatepass,
      parentNotification: {
        status: delivery.status,
        emailConfigured: delivery.emailConfigured,
        emailSent: delivery.emailSent,
        emailFailed: delivery.emailFailed
      }
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to reject gatepass",
      error: err.message
    });
  }
};
