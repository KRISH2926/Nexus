const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const SecurityPersonnel = require("../models/securityPersonnelModel");
const Admin = require("../models/adminModel");
const Parent = require("../models/parentModel");
const Batch = require("../models/batchModel");
const RegistrationCode = require("../models/registrationCodeModel");
const RegistrationInvitation = require("../models/registrationInvitationModel");
const writeAdminAudit = require("../services/adminAudit");
const {
  hashSecret,
  secretsMatch,
  createRegistrationCode,
  createInvitationToken,
  createVerificationToken
} = require("../utils/registrationSecurity");
const { isConfigured, sendVerificationEmail } = require("../services/verificationEmail");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const verificationLifetimeMs = 24 * 60 * 60 * 1000;
const defaultCodeLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const defaultInvitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const accountModels = { student: Student, teacher: Teacher, security: SecurityPersonnel };

const normalizeText = (value) => typeof value === "string" ? value.trim() : "";
const validEmail = (value) => EMAIL_PATTERN.test(value) && value.length <= 254;
const validMobile = (value) => MOBILE_PATTERN.test(value);
const validDate = (value, defaultLifetimeMs) => {
  if (value !== undefined && typeof value !== "string") return null;
  const date = value === undefined ? new Date(Date.now() + defaultLifetimeMs) : new Date(value);
  return Number.isNaN(date.getTime()) || date.getTime() <= Date.now() ? null : date;
};
const queryWithSecret = (query, fields) => query && typeof query.select === "function"
  ? query.select(fields)
  : query;
const safeAccount = (account) => ({
  id: String(account._id),
  name: account.name,
  email: account.email,
  accountStatus: account.status || "active",
  emailVerified: Boolean(account.emailVerified)
});
const sendServerError = (res) => res.status(500).json({ message: "Server error" });

async function emailAlreadyRegistered(email) {
  const existing = await Promise.all([
    Student.findOne({ email }),
    Teacher.findOne({ email }),
    SecurityPersonnel.findOne({ email }),
    Parent.findOne({ email }),
    Admin.findOne({ email })
  ]);
  return existing.some(Boolean);
}

async function savePendingAccount(Model, fields) {
  const token = createVerificationToken();
  const account = new Model({
    ...fields,
    status: "pending",
    emailVerified: false,
    emailVerificationTokenHash: hashSecret(token),
    emailVerificationExpiresAt: new Date(Date.now() + verificationLifetimeMs)
  });
  await account.save();
  return { account, token };
}

async function deliverVerificationEmail(email, token) {
  try {
    return await sendVerificationEmail(email, token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email delivery error";
    console.error("Verification email delivery failed:", message);
    return false;
  }
}

async function redeemStudentCode(code, batch, rollNo) {
  const codeHash = hashSecret(code.toUpperCase());
  const record = await RegistrationCode.findOne({
    codeHash,
    type: { $in: ["individual", "batch"] },
    batch,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  });
  if (!record || record.redemptionCount >= record.maxRedemptions) return null;
  if (record.type === "individual" && record.rollNo !== rollNo) return null;
  return {
    codeHash,
    query: {
      codeHash,
      batch,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
      $expr: { $lt: ["$redemptionCount", "$maxRedemptions"] }
    }
  };
}

async function redeemInvitation(token, role, email) {
  const tokenHash = hashSecret(token);
  const record = await RegistrationInvitation.findOne({
    tokenHash,
    role,
    revokedAt: null,
    redeemedAt: null,
    expiresAt: { $gt: new Date() }
  });
  if (!record || (record.invitedEmail && record.invitedEmail !== email)) return null;
  return {
    tokenHash,
    query: {
      tokenHash,
      role,
      revokedAt: null,
      redeemedAt: null,
      expiresAt: { $gt: new Date() },
      $or: [{ invitedEmail: null }, { invitedEmail: email }]
    }
  };
}

exports.batchOptions = async (req, res) => {
  try {
    const batches = await Batch.find({})
      .select("name startYear endYear")
      .sort({ startYear: -1, name: 1 })
      .lean();
    return res.json({
      batches: batches.map(({ _id, name, startYear, endYear }) => ({
        id: String(_id),
        name,
        startYear,
        endYear
      }))
    });
  } catch {
    return sendServerError(res);
  }
};

exports.register = async (req, res) => {
  let createdAccount;
  let createdModel;
  let verificationEmailSent = false;
  try {
    const body = req.body || {};
    const role = body.role;
    const name = normalizeText(body.name);
    const email = normalizeText(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!["student", "teacher", "security"].includes(role)) {
      return res.status(400).json({ message: "A valid account role is required" });
    }
    if (name.length < 2 || name.length > 100 || !validEmail(email)) {
      return res.status(400).json({ message: "Valid name and email are required" });
    }
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72 ||
        password !== confirmPassword) {
      return res.status(400).json({ message: "Password must be at least 8 characters and match confirmation" });
    }
    if (await emailAlreadyRegistered(email)) {
      return res.status(409).json({ message: "Unable to register this account" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    let account;
    if (role === "student") {
      const rollNo = normalizeText(body.rollNo);
      const studentMobile = normalizeText(body.studentMobile);
      const parentName = normalizeText(body.parentName);
      const parentEmail = normalizeText(body.parentEmail).toLowerCase();
      const parentMobile = normalizeText(body.parentMobile);
      const batch = normalizeText(body.batch);
      const registrationCode = normalizeText(body.registrationCode);
      if (!rollNo || rollNo.length > 50 || !validMobile(studentMobile) ||
          parentName.length < 2 || parentName.length > 100 || !validEmail(parentEmail) ||
          !validMobile(parentMobile) || !mongoose.Types.ObjectId.isValid(batch) ||
          !registrationCode || registrationCode.length > 128) {
        return res.status(400).json({ message: "Valid student registration details are required" });
      }
      const batchRecord = await Batch.findById(batch);
      if (!batchRecord) return res.status(400).json({ message: "Invalid batch" });
      const existingRollNo = await Student.findOne({ rollNo });
      if (existingRollNo) return res.status(409).json({ message: "Unable to register this account" });

      const redemption = await redeemStudentCode(registrationCode, batchRecord._id, rollNo);
      if (!redemption) return res.status(400).json({ message: "Registration code is invalid or unavailable" });
      const saved = await savePendingAccount(Student, {
        name,
        email,
        password: hashedPassword,
        rollNo,
        studentMobile,
        parentName,
        parentEmail,
        parentMobile,
        batch: batchRecord._id
      });
      account = saved.account;
      createdAccount = account;
      createdModel = Student;
      const redeemed = await RegistrationCode.findOneAndUpdate(
        redemption.query,
        { $inc: { redemptionCount: 1 } },
        { new: true }
      );
      if (!redeemed) {
        await Student.deleteOne({ _id: account._id });
        createdAccount = null;
        return res.status(400).json({ message: "Registration code is invalid or unavailable" });
      }
      createdAccount = null;
      verificationEmailSent = await deliverVerificationEmail(email, saved.token);
    } else {
      const mobile = normalizeText(body.mobile);
      const invitationCode = normalizeText(body.invitationCode);
      if (!validMobile(mobile) || !invitationCode || invitationCode.length > 128) {
        return res.status(400).json({ message: "Valid registration details are required" });
      }
      const invitation = await redeemInvitation(invitationCode, role, email);
      if (!invitation) return res.status(400).json({ message: "Invitation is invalid or unavailable" });

      let batchRecord;
      let fields;
      let Model = accountModels[role];
      if (role === "teacher") {
        const batch = normalizeText(body.batch);
        if (!mongoose.Types.ObjectId.isValid(batch)) {
          return res.status(400).json({ message: "A valid batch is required" });
        }
        batchRecord = await Batch.findById(batch);
        if (!batchRecord) return res.status(400).json({ message: "Invalid batch" });
        fields = { name, email, password: hashedPassword, mobile, batch: batchRecord._id };
      } else {
        const employeeId = normalizeText(body.employeeId);
        const assignedGate = normalizeText(body.assignedGate);
        if (!employeeId || employeeId.length > 50 || !assignedGate || assignedGate.length > 100) {
          return res.status(400).json({ message: "Valid security registration details are required" });
        }
        fields = { name, email, password: hashedPassword, mobile, employeeId, assignedGate };
      }

      const saved = await savePendingAccount(Model, fields);
      account = saved.account;
      createdAccount = account;
      createdModel = Model;
      const redeemed = await RegistrationInvitation.findOneAndUpdate(
        invitation.query,
        { $set: { redeemedAt: new Date() } },
        { new: true }
      );
      if (!redeemed) {
        await Model.deleteOne({ _id: account._id });
        createdAccount = null;
        return res.status(400).json({ message: "Invitation is invalid or unavailable" });
      }
      createdAccount = null;
      verificationEmailSent = await deliverVerificationEmail(email, saved.token);
    }

    return res.status(202).json({
      message: verificationEmailSent
        ? "Registration received. Verify your email before requesting account activation."
        : "Registration received, but the verification email could not be sent. Contact campus support to complete verification.",
      accountStatus: "pending",
      requiresEmailVerification: true,
      verificationEmailSent
    });
  } catch (error) {
    if (createdAccount && createdModel) {
      await createdModel.deleteOne({ _id: createdAccount._id }).catch(() => {});
    }
    if (error && error.code === 11000) {
      return res.status(409).json({ message: "Unable to register this account" });
    }
    return sendServerError(res);
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    if (!token || token.length > 256) {
      return res.status(400).json({ message: "A valid verification token is required" });
    }
    const tokenHash = hashSecret(token);
    const models = [Student, Teacher, SecurityPersonnel, Parent];
    for (const Model of models) {
      const candidate = await queryWithSecret(
        Model.findOne({ emailVerificationTokenHash: tokenHash }),
        "+emailVerificationTokenHash +emailVerificationExpiresAt +pendingStudent"
      );
      if (!candidate || !secretsMatch(token, candidate.emailVerificationTokenHash)) continue;
      if (!candidate.emailVerificationExpiresAt ||
          candidate.emailVerificationExpiresAt.getTime() <= Date.now()) {
        return res.status(400).json({ message: "Verification token is invalid or expired" });
      }
      const isParent = Model === Parent;
      if (isParent && !candidate.pendingStudent) {
        return res.status(400).json({ message: "Verification token is invalid or expired" });
      }
      if (isParent) {
        const linkedStudent = await Student.findOne({
          _id: candidate.pendingStudent,
          parentEmail: candidate.email,
          status: { $nin: ["pending", "disabled"] }
        }).select("_id");
        if (!linkedStudent) {
          return res.status(400).json({ message: "The student link is no longer eligible for verification" });
        }
      }
      const update = {
        $set: isParent
          ? { emailVerified: true, status: "active", students: [candidate.pendingStudent] }
          : { emailVerified: true },
        $unset: {
          emailVerificationTokenHash: 1,
          emailVerificationExpiresAt: 1,
          ...(isParent ? { pendingStudent: 1 } : {})
        }
      };
      const verified = await Model.findOneAndUpdate(
        {
          _id: candidate._id,
          emailVerificationTokenHash: tokenHash,
          emailVerificationExpiresAt: { $gt: new Date() }
        },
        update,
        { new: true }
      );
      if (!verified) return res.status(400).json({ message: "Verification token is invalid or expired" });
      return res.json({
        message: isParent
          ? "Email verified. Your parent portal is now active."
          : "Email verified. Your account is pending admin activation.",
        accountStatus: verified.status || "active"
      });
    }
    return res.status(400).json({ message: "Verification token is invalid or expired" });
  } catch {
    return sendServerError(res);
  }
};

exports.resendVerification = async (req, res) => {
  const email = normalizeText(req.body?.email).toLowerCase();
  if (!validEmail(email)) {
    return res.status(400).json({ message: "A valid email address is required" });
  }
  const demoVerificationEnabled = process.env.NODE_ENV !== "production" && process.env.NEXUS_DEMO_MODE === "true";
  if (!isConfigured() && !demoVerificationEnabled) {
    return res.status(503).json({ message: "Email delivery is not configured. Contact campus support." });
  }

  try {
    for (const Model of [Student, Teacher, SecurityPersonnel, Parent]) {
      const account = await Model.findOne({ email, status: "pending", emailVerified: false });
      if (!account) continue;

      const token = createVerificationToken();
      const updated = await Model.findOneAndUpdate(
        { _id: account._id, status: "pending", emailVerified: false },
        {
          $set: {
            emailVerificationTokenHash: hashSecret(token),
            emailVerificationExpiresAt: new Date(Date.now() + verificationLifetimeMs)
          }
        },
        { new: true }
      );
      const verificationEmailSent = updated ? await deliverVerificationEmail(email, token) : false;
      if (updated && !verificationEmailSent && !demoVerificationEnabled) {
        return res.status(503).json({ message: "The verification email could not be delivered. Try again later." });
      }
      return res.status(202).json({
        message: verificationEmailSent
          ? "If an eligible pending account exists, a new verification link has been sent."
          : "A local development verification link is ready.",
        ...(updated && demoVerificationEnabled && !verificationEmailSent
          ? { developmentVerificationUrl: `${(process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "")}/verify-email?token=${encodeURIComponent(token)}` }
          : {})
      });
    }

    return res.status(202).json({
      message: "If an eligible pending account exists, a new verification link has been sent."
    });
  } catch {
    return sendServerError(res);
  }
};

exports.createStudentCode = async (req, res) => {
  try {
    const body = req.body || {};
    const type = body.type;
    const batch = normalizeText(body.batch);
    const rollNo = normalizeText(body.rollNo);
    const maxRedemptions = body.maxRedemptions === undefined ? 1 : Number(body.maxRedemptions);
    const expiresAt = validDate(body.expiresAt, defaultCodeLifetimeMs);
    if (!["individual", "batch"].includes(type) || !mongoose.Types.ObjectId.isValid(batch) || !expiresAt ||
        !Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 10000 ||
        (type === "individual" && (!rollNo || rollNo.length > 50))) {
      return res.status(400).json({ message: "Valid code type, batch, redemption limit, and expiry are required" });
    }
    if (type === "individual" && maxRedemptions !== 1) {
      return res.status(400).json({ message: "Individual codes can only be redeemed once" });
    }
    const batchRecord = await Batch.findById(batch);
    if (!batchRecord) return res.status(400).json({ message: "Invalid batch" });
    const code = createRegistrationCode();
    const record = await RegistrationCode.create({
      codeHash: hashSecret(code),
      type,
      batch: batchRecord._id,
      rollNo: type === "individual" ? rollNo : undefined,
      maxRedemptions,
      expiresAt
    });
    await writeAdminAudit(req, { action: "registration.student-code.created", resource: "RegistrationCode", resourceId: record._id,
      summary: `Created ${type} student registration code for ${batchRecord.name}`,
      metadata: { type, batch: String(batchRecord._id), rollNo: type === "individual" ? rollNo : undefined, maxRedemptions, expiresAt } });
    return res.status(201).json({
      message: "Registration code created. Copy it now; it will not be shown again.",
      code,
      registrationCode: {
        id: String(record._id),
        type,
        batch: String(batchRecord._id),
        rollNo: type === "individual" ? rollNo : undefined,
        maxRedemptions,
        redemptionCount: 0,
        expiresAt
      }
    });
  } catch {
    return sendServerError(res);
  }
};

exports.listStudentCodes = async (req, res) => {
  try {
    const codes = await RegistrationCode.find({})
      .select("-codeHash")
      .populate("batch", "name")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({
      codes: codes.map((code) => ({
        id: String(code._id),
        type: code.type,
        batch: code.batch ? { id: String(code.batch._id), name: code.batch.name } : null,
        rollNo: code.rollNo,
        maxRedemptions: code.maxRedemptions,
        redemptionCount: code.redemptionCount,
        expiresAt: code.expiresAt,
        revokedAt: code.revokedAt
      }))
    });
  } catch {
    return sendServerError(res);
  }
};

exports.revokeStudentCode = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid code id" });
    }
    const code = await RegistrationCode.findOneAndUpdate(
      { _id: req.params.id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { new: true }
    ).select("-codeHash");
    if (!code) return res.status(404).json({ message: "Registration code not found" });
    await writeAdminAudit(req, { action: "registration.student-code.revoked", resource: "RegistrationCode", resourceId: code._id,
      summary: "Revoked a student registration code", metadata: { type: code.type, batch: String(code.batch), rollNo: code.rollNo } });
    return res.json({
      message: "Registration code revoked",
      registrationCode: {
        id: String(code._id),
        type: code.type,
        batch: String(code.batch),
        rollNo: code.rollNo,
        maxRedemptions: code.maxRedemptions,
        redemptionCount: code.redemptionCount,
        expiresAt: code.expiresAt,
        revokedAt: code.revokedAt
      }
    });
  } catch {
    return sendServerError(res);
  }
};

exports.createInvitation = async (req, res) => {
  try {
    const role = req.body?.role;
    const invitedEmail = req.body?.email === undefined
      ? undefined
      : normalizeText(req.body.email).toLowerCase();
    const expiresAt = validDate(req.body?.expiresAt, defaultInvitationLifetimeMs);
    if (!["teacher", "security"].includes(role) || !expiresAt ||
        (invitedEmail !== undefined && !validEmail(invitedEmail))) {
      return res.status(400).json({ message: "Valid role, optional email, and expiry are required" });
    }
    const token = createInvitationToken();
    const invitation = await RegistrationInvitation.create({
      tokenHash: hashSecret(token),
      role,
      invitedEmail,
      expiresAt
    });
    await writeAdminAudit(req, { action: "registration.invitation.created", resource: "RegistrationInvitation", resourceId: invitation._id,
      summary: `Created ${role} registration invitation`, metadata: { role, invitedEmail, expiresAt } });
    return res.status(201).json({
      message: "Invitation created. Copy its code now; it will not be shown again.",
      invitationCode: token,
      invitation: {
        id: String(invitation._id),
        role,
        email: invitedEmail,
        expiresAt
      }
    });
  } catch {
    return sendServerError(res);
  }
};

exports.listInvitations = async (req, res) => {
  try {
    const invitations = await RegistrationInvitation.find({})
      .select("-tokenHash")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({
      invitations: invitations.map((invitation) => ({
        id: String(invitation._id),
        role: invitation.role,
        email: invitation.invitedEmail,
        expiresAt: invitation.expiresAt,
        redeemedAt: invitation.redeemedAt,
        revokedAt: invitation.revokedAt
      }))
    });
  } catch {
    return sendServerError(res);
  }
};

exports.revokeInvitation = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid invitation id" });
    }
    const invitation = await RegistrationInvitation.findOneAndUpdate(
      { _id: req.params.id, redeemedAt: null, revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { new: true }
    ).select("-tokenHash");
    if (!invitation) return res.status(404).json({ message: "Unused invitation not found" });
    await writeAdminAudit(req, { action: "registration.invitation.revoked", resource: "RegistrationInvitation", resourceId: invitation._id,
      summary: `Revoked ${invitation.role} registration invitation`, metadata: { role: invitation.role, invitedEmail: invitation.invitedEmail } });
    return res.json({
      message: "Invitation revoked",
      invitation: {
        id: String(invitation._id),
        role: invitation.role,
        email: invitation.invitedEmail,
        expiresAt: invitation.expiresAt,
        redeemedAt: invitation.redeemedAt,
        revokedAt: invitation.revokedAt
      }
    });
  } catch {
    return sendServerError(res);
  }
};

exports.listPendingAccounts = async (req, res) => {
  try {
    const pending = await Promise.all(Object.entries(accountModels).map(async ([role, Model]) => {
      const accounts = await Model.find({ status: "pending" })
        .select("name email emailVerified createdAt")
        .sort({ createdAt: 1 })
        .lean();
      return accounts.map((account) => ({
        id: String(account._id),
        role,
        name: account.name,
        email: account.email,
        emailVerified: Boolean(account.emailVerified),
        createdAt: account.createdAt
      }));
    }));
    return res.json({ accounts: pending.flat() });
  } catch {
    return sendServerError(res);
  }
};

exports.approvePendingAccount = async (req, res) => {
  try {
    const role = req.params.role;
    const Model = accountModels[role];
    if (!Model) return res.status(400).json({ message: "Invalid account role" });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid account id" });
    }
    const account = await Model.findOneAndUpdate(
      { _id: req.params.id, status: "pending", emailVerified: true },
      { $set: { status: "active" } },
      { new: true }
    ).select("name email status emailVerified");
    if (!account) {
      return res.status(409).json({
        message: "Account is not pending or its email has not been verified"
      });
    }
    await writeAdminAudit(req, { action: "registration.account.activated", resource: role, resourceId: account._id,
      summary: `Activated ${role} account ${account.name}`, metadata: { role, name: account.name, email: account.email } });
    return res.json({
      message: "Account activated",
      account: safeAccount(account)
    });
  } catch {
    return sendServerError(res);
  }
};
