const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Parent = require("../models/parentModel");
const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const SecurityPersonnel = require("../models/securityPersonnelModel");
const Admin = require("../models/adminModel");
const Gatepass = require("../models/gatepassModel");
const ParentNotification = require("../models/parentNotificationModel");
const { hashSecret, createVerificationToken } = require("../utils/registrationSecurity");
const { sendVerificationEmail } = require("../services/verificationEmail");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const verificationLifetimeMs = 24 * 60 * 60 * 1000;
const normalizeEmail = (value) => typeof value === "string" ? value.trim().toLowerCase() : "";
const genericFailure = (res) => res.status(500).json({ message: "Server error" });

exports.register = async (req, res) => {
  let savedParent;
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = normalizeEmail(req.body?.email);
    const rollNo = typeof req.body?.rollNo === "string" ? req.body.rollNo.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const confirmPassword = typeof req.body?.confirmPassword === "string" ? req.body.confirmPassword : "";
    if (name.length < 2 || name.length > 100 || !EMAIL_PATTERN.test(email) || email.length > 254 ||
        !rollNo || rollNo.length > 50 || password.length < 8 || Buffer.byteLength(password, "utf8") > 72 ||
        password !== confirmPassword) {
      return res.status(400).json({ message: "Valid parent details, student roll number, and matching password are required" });
    }

    const student = await Student.findOne({
      rollNo,
      parentEmail: email,
      status: { $nin: ["pending", "disabled"] }
    }).select("_id parentEmail");
    if (!student) {
      return res.status(400).json({ message: "Unable to verify this student and parent email combination" });
    }

    const existing = await Promise.all([
      Student.findOne({ email }),
      Teacher.findOne({ email }),
      SecurityPersonnel.findOne({ email }),
      Admin.findOne({ email }),
      Parent.findOne({ email })
    ]);
    if (existing.some(Boolean)) {
      return res.status(409).json({ message: "Unable to register this parent account" });
    }

    const token = createVerificationToken();
    const parent = new Parent({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      pendingStudent: student._id,
      status: "pending",
      emailVerified: false,
      emailVerificationTokenHash: hashSecret(token),
      emailVerificationExpiresAt: new Date(Date.now() + verificationLifetimeMs)
    });
    await parent.save();
    savedParent = parent;

    let verificationEmailSent = false;
    try {
      verificationEmailSent = await sendVerificationEmail(email, token);
    } catch (error) {
      console.error("Parent verification email delivery failed:", error instanceof Error ? error.message : "Unknown error");
    }
    return res.status(202).json({
      message: verificationEmailSent
        ? "Parent registration received. Verify your email to activate the linked portal account."
        : "Parent registration received, but no verification email was delivered. Contact campus support to complete verification.",
      accountStatus: "pending",
      requiresEmailVerification: true,
      verificationEmailSent,
      ...(process.env.NODE_ENV !== "production" && process.env.NEXUS_DEMO_MODE === "true"
        ? { developmentVerificationUrl: `${(process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "")}/verify-email?token=${encodeURIComponent(token)}` }
        : {})
    });
  } catch (error) {
    if (savedParent) await Parent.deleteOne({ _id: savedParent._id }).catch(() => {});
    if (error?.code === 11000) return res.status(409).json({ message: "Unable to register this parent account" });
    return genericFailure(res);
  }
};

const loadActiveParent = async (id) => Parent.findOne({
  _id: id,
  status: "active",
  emailVerified: true
});

exports.getWorkspace = async (req, res) => {
  try {
    const parent = await loadActiveParent(req.user.id);
    if (!parent) return res.status(403).json({ message: "Parent account is not active" });
    const students = await Student.find({ _id: { $in: parent.students } })
      .select("name rollNo batch")
      .populate("batch", "name")
      .sort({ name: 1 });
    const [notifications, gatepasses] = await Promise.all([
      ParentNotification.find({ parent: parent._id })
        .populate("student", "name rollNo")
        .sort({ createdAt: -1 })
        .limit(30),
      Gatepass.find({ student: { $in: parent.students } })
        .select("student date reason details exitTime expectedReturnTime status createdAt teacherDecisionAt parentDecision issuedAt expiresAt exitRecord returnRecord")
        .populate("student", "name rollNo")
        .sort({ createdAt: -1 })
        .limit(20)
    ]);
    return res.json({
      parent: { id: String(parent._id), name: parent.name, email: parent.email },
      students,
      notifications,
      gatepasses
    });
  } catch {
    return genericFailure(res);
  }
};

exports.linkStudent = async (req, res) => {
  try {
    const rollNo = typeof req.body?.rollNo === "string" ? req.body.rollNo.trim() : "";
    if (!rollNo || rollNo.length > 50) return res.status(400).json({ message: "A valid student roll number is required" });
    const parent = await loadActiveParent(req.user.id);
    if (!parent) return res.status(403).json({ message: "Parent account is not active" });
    const student = await Student.findOne({
      rollNo,
      parentEmail: parent.email,
      status: { $nin: ["pending", "disabled"] }
    }).select("_id name rollNo batch").populate("batch", "name");
    if (!student) return res.status(404).json({ message: "No active student was found for this verified parent email" });

    const result = await Parent.updateOne(
      { _id: parent._id, status: "active", emailVerified: true },
      { $addToSet: { students: student._id } }
    );
    if (!result.matchedCount) return res.status(403).json({ message: "Parent account is not active" });
    return res.json({ message: "Student linked to your parent portal", student });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) return res.status(400).json({ message: "Invalid student details" });
    return genericFailure(res);
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const parent = await loadActiveParent(req.user.id);
    if (!parent) return res.status(403).json({ message: "Parent account is not active" });
    const notification = await ParentNotification.findOneAndUpdate(
      { _id: req.params.id, parent: parent._id },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    return res.json({ notification });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) return res.status(400).json({ message: "Invalid notification" });
    return genericFailure(res);
  }
};
