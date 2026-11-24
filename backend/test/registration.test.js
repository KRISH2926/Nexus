const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const SecurityPersonnel = require("../models/securityPersonnelModel");
const Admin = require("../models/adminModel");
const Parent = require("../models/parentModel");
const Batch = require("../models/batchModel");
const RegistrationCode = require("../models/registrationCodeModel");
const RegistrationInvitation = require("../models/registrationInvitationModel");
const AuditLog = require("../models/auditLogModel");
const registrationController = require("../controllers/registrationController");
const authController = require("../controllers/authController");
const { authorizeRoles } = require("../middleware/authMiddleware");
const { hashSecret } = require("../utils/registrationSecurity");

const makeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

const mockMethods = (t, Model, replacements) => {
  for (const [name, replacement] of Object.entries(replacements)) {
    const original = Model[name];
    Model[name] = replacement;
    t.after(() => {
      Model[name] = original;
    });
  }
};

const silenceSmtp = (t) => {
  const names = ["SMTP_HOST", "SMTP_PORT", "SMTP_FROM", "SMTP_USER", "SMTP_PASSWORD"];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  for (const name of names) delete process.env[name];
  t.after(() => {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  });
};

test("student code redemption is atomic and leaves new accounts pending", async (t) => {
  silenceSmtp(t);
  const batchId = new mongoose.Types.ObjectId();
  const rawCode = "NXS-" + "A".repeat(48);
  let savedStudent;
  let redemptionCount = 0;
  mockMethods(t, Student, {
    findOne: async () => null,
    deleteOne: async () => ({ deletedCount: 1 })
  });
  mockMethods(t, Student.prototype, {
    save: async function () {
      this._id = new mongoose.Types.ObjectId();
      savedStudent = this;
      return this;
    }
  });
  mockMethods(t, Teacher, { findOne: async () => null });
  mockMethods(t, SecurityPersonnel, { findOne: async () => null });
  mockMethods(t, Admin, { findOne: async () => null });
  mockMethods(t, Parent, { findOne: async () => null });
  mockMethods(t, Batch, { findById: async () => ({ _id: batchId }) });
  mockMethods(t, RegistrationCode, {
    findOne: async () => ({
      type: "batch",
      batch: batchId,
      maxRedemptions: 1,
      redemptionCount,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null
    }),
    findOneAndUpdate: async (filter) => {
      assert.equal(filter.codeHash, hashSecret(rawCode));
      assert.deepEqual(filter.$expr, { $lt: ["$redemptionCount", "$maxRedemptions"] });
      if (redemptionCount >= 1) return null;
      redemptionCount += 1;
      return { redemptionCount };
    }
  });

  const response = makeResponse();
  await registrationController.register({
    body: {
      role: "student",
      name: "Student One",
      email: "student@example.test",
      password: "a-secure-password",
      confirmPassword: "a-secure-password",
      rollNo: "R-100",
      batch: String(batchId),
      registrationCode: rawCode.toLowerCase(),
      studentMobile: "9876543210",
      parentName: "Parent One",
      parentEmail: "parent@example.test",
      parentMobile: "9876543211"
    }
  }, response);

  assert.equal(response.statusCode, 202);
  assert.deepEqual(response.body, {
    message: "Registration received, but the verification email could not be sent. Contact campus support to complete verification.",
    accountStatus: "pending",
    requiresEmailVerification: true,
    verificationEmailSent: false
  });
  assert.equal(savedStudent.status, "pending");
  assert.equal(savedStudent.emailVerified, false);
  assert.notEqual(savedStudent.password, "a-secure-password");
  assert.ok(savedStudent.emailVerificationTokenHash);
  assert.equal(JSON.stringify(response.body).includes(savedStudent.emailVerificationTokenHash), false);
  assert.equal(redemptionCount, 1);

  const secondUse = makeResponse();
  await registrationController.register({
    body: {
      role: "student",
      name: "Student Two",
      email: "student-two@example.test",
      password: "a-secure-password",
      confirmPassword: "a-secure-password",
      rollNo: "R-101",
      batch: String(batchId),
      registrationCode: rawCode,
      studentMobile: "9876543210",
      parentName: "Parent Two",
      parentEmail: "parent-two@example.test",
      parentMobile: "9876543211"
    }
  }, secondUse);
  assert.equal(secondUse.statusCode, 400);
  assert.equal(redemptionCount, 1);
});

test("teacher invitations are role-bound and redeemed only once", async (t) => {
  silenceSmtp(t);
  const rawInvitation = "one-time-invitation";
  let savedSecurity;
  let redeemed = false;
  mockMethods(t, Student, { findOne: async () => null });
  mockMethods(t, Teacher, { findOne: async () => null });
  mockMethods(t, SecurityPersonnel, {
    findOne: async () => null,
    deleteOne: async () => ({ deletedCount: 1 })
  });
  mockMethods(t, SecurityPersonnel.prototype, {
    save: async function () {
      this._id = new mongoose.Types.ObjectId();
      savedSecurity = this;
      return this;
    }
  });
  mockMethods(t, Admin, { findOne: async () => null });
  mockMethods(t, Parent, { findOne: async () => null });
  mockMethods(t, RegistrationInvitation, {
    findOne: async (filter) => filter.role === "security" ? {
      role: "security",
      invitedEmail: "guard@example.test",
      expiresAt: new Date(Date.now() + 60_000),
      redeemedAt: null,
      revokedAt: null
    } : null,
    findOneAndUpdate: async (filter) => {
      assert.equal(filter.role, "security");
      assert.equal(filter.tokenHash, hashSecret(rawInvitation));
      if (redeemed) return null;
      redeemed = true;
      return { redeemedAt: new Date() };
    }
  });

  const badRole = makeResponse();
  await registrationController.register({
    body: {
      role: "teacher",
      name: "Guard One",
      email: "guard@example.test",
      password: "a-secure-password",
      confirmPassword: "a-secure-password",
      mobile: "9876543210",
      employeeId: "EMP-1",
      assignedGate: "North",
      invitationCode: rawInvitation
    }
  }, badRole);
  assert.equal(badRole.statusCode, 400);
  assert.equal(savedSecurity, undefined);

  const accepted = makeResponse();
  await registrationController.register({
    body: {
      role: "security",
      name: "Guard One",
      email: "guard@example.test",
      password: "a-secure-password",
      confirmPassword: "a-secure-password",
      mobile: "9876543210",
      employeeId: "EMP-1",
      assignedGate: "North",
      invitationCode: rawInvitation
    }
  }, accepted);
  assert.equal(accepted.statusCode, 202);
  assert.equal(savedSecurity.status, "pending");
  assert.equal(redeemed, true);
  assert.equal(JSON.stringify(accepted.body).includes(rawInvitation), false);

  const reused = makeResponse();
  await registrationController.register({
    body: {
      role: "security",
      name: "Guard Two",
      email: "guard-two@example.test",
      password: "a-secure-password",
      confirmPassword: "a-secure-password",
      mobile: "9876543210",
      employeeId: "EMP-2",
      assignedGate: "South",
      invitationCode: rawInvitation
    }
  }, reused);
  assert.equal(reused.statusCode, 400);
});

test("activation requires verified pending account and admin authorization", async (t) => {
  mockMethods(t, AuditLog, { create: async (entry) => entry });
  let updateFilter;
  mockMethods(t, Teacher, {
    findOneAndUpdate: (filter) => {
      updateFilter = filter;
      const query = {
        select: async () => ({
          _id: filter._id,
          name: "Teacher One",
          email: "teacher@example.test",
          status: "active",
          emailVerified: true
        })
      };
      return query;
    }
  });

  const denied = makeResponse();
  let continued = false;
  authorizeRoles("admin")(
    { user: { role: "teacher" } },
    denied,
    () => { continued = true; }
  );
  assert.equal(denied.statusCode, 403);
  assert.equal(continued, false);

  const response = makeResponse();
  await registrationController.approvePendingAccount({
    user: { id: new mongoose.Types.ObjectId().toString() },
    params: { role: "teacher", id: new mongoose.Types.ObjectId().toString() }
  }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(updateFilter.status, "pending");
  assert.equal(updateFilter.emailVerified, true);
  assert.equal(response.body.account.accountStatus, "active");
  assert.equal(JSON.stringify(response.body).includes("password"), false);
});

test("login blocks pending accounts and derives security role from its model", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "x".repeat(32);
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  const password = "a-secure-password";
  const passwordHash = await bcrypt.hash(password, 4);
  mockMethods(t, Student, {
    findOne: async ({ email }) => email === "pending@example.test"
      ? { status: "pending", password: passwordHash }
      : null
  });
  mockMethods(t, Teacher, { findOne: async () => null });
  mockMethods(t, SecurityPersonnel, {
    findOne: async () => ({
      _id: new mongoose.Types.ObjectId(),
      name: "Guard One",
      email: "guard@example.test",
      password: passwordHash,
      role: "admin"
    })
  });
  mockMethods(t, Admin, { findOne: async () => null });

  const pending = makeResponse();
  await authController.login({
    body: { email: "pending@example.test", password }
  }, pending);
  assert.equal(pending.statusCode, 403);

  const active = makeResponse();
  await authController.login({
    body: { email: "guard@example.test", password }
  }, active);
  assert.equal(active.statusCode, 200);
  assert.equal(jwt.decode(active.body.token).role, "security");
  assert.equal(active.body.user.role, "security");
});

test("verification resend reports missing SMTP configuration", async (t) => {
  silenceSmtp(t);
  const response = makeResponse();
  await registrationController.resendVerification({
    body: { email: "student@example.test" }
  }, response);

  assert.equal(response.statusCode, 503);
  assert.match(response.body.message, /email delivery is not configured/i);
});
