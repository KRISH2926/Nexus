const test = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const Parent = require("../models/parentModel");
const ParentNotification = require("../models/parentNotificationModel");
const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const SecurityPersonnel = require("../models/securityPersonnelModel");
const Admin = require("../models/adminModel");
const Gatepass = require("../models/gatepassModel");
const parentController = require("../controllers/parentController");
const parentNotifications = require("../services/parentNotifications");
const registrationController = require("../controllers/registrationController");
const authController = require("../controllers/authController");
const gatepassController = require("../controllers/gatepassController");
const { hashSecret } = require("../utils/registrationSecurity");

const makeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

const mockMethods = (t, Model, replacements) => {
  for (const [name, replacement] of Object.entries(replacements)) {
    const original = Model[name];
    Model[name] = replacement;
    t.after(() => { Model[name] = original; });
  }
};

test("parent registration requires the campus-record email and leaves an unverified account pending", async (t) => {
  let savedParent;
  const student = { _id: new mongoose.Types.ObjectId() };
  mockMethods(t, Student, {
    findOne: (filter) => filter.rollNo
      ? { select: async () => student }
      : null
  });
  mockMethods(t, Teacher, { findOne: async () => null });
  mockMethods(t, SecurityPersonnel, { findOne: async () => null });
  mockMethods(t, Admin, { findOne: async () => null });
  mockMethods(t, Parent, {
    findOne: async () => null,
    deleteOne: async () => ({ deletedCount: 1 })
  });
  mockMethods(t, Parent.prototype, {
    save: async function () { this._id = "parent-1"; savedParent = this; return this; }
  });

  const response = makeResponse();
  await parentController.register({
    body: {
      name: "Parent One",
      email: "parent@example.test",
      rollNo: "R-100",
      password: "a-strong-parent-password",
      confirmPassword: "a-strong-parent-password"
    }
  }, response);

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.accountStatus, "pending");
  assert.equal(response.body.requiresEmailVerification, true);
  assert.equal(response.body.verificationEmailSent, false);
  assert.equal(savedParent.pendingStudent, student._id);
  assert.equal(savedParent.emailVerified, false);
  assert.notEqual(savedParent.password, "a-strong-parent-password");
  assert.ok(savedParent.emailVerificationTokenHash);
  assert.equal(JSON.stringify(response.body).includes(savedParent.emailVerificationTokenHash), false);
});

test("parent verification activates the account and links only the invited student", async (t) => {
  const rawToken = "parent-verification-token";
  const parent = {
    _id: "parent-1",
    pendingStudent: "student-1",
    emailVerificationTokenHash: hashSecret(rawToken),
    emailVerificationExpiresAt: new Date(Date.now() + 60_000)
  };
  let update;
  mockMethods(t, Student, {
    findOne: (filter) => filter._id
      ? { select: async () => ({ _id: filter._id }) }
      : null
  });
  mockMethods(t, Teacher, { findOne: async () => null });
  mockMethods(t, SecurityPersonnel, { findOne: async () => null });
  mockMethods(t, Parent, {
    findOne: () => ({ select: async () => parent }),
    findOneAndUpdate: async (_filter, nextUpdate) => { update = nextUpdate; return { status: "active" }; }
  });

  const response = makeResponse();
  await registrationController.verifyEmail({ body: { token: rawToken } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.accountStatus, "active");
  assert.match(response.body.message, /parent portal is now active/i);
  assert.deepEqual(update.$set, { emailVerified: true, status: "active", students: ["student-1"] });
  assert.ok(update.$unset.pendingStudent);
});

test("parent linking is restricted to the verified parent email on the student record", async (t) => {
  const parent = { _id: "parent-1", email: "parent@example.test", students: [] };
  let studentFilter;
  let parentUpdate;
  mockMethods(t, Parent, {
    findOne: async () => parent,
    updateOne: async (filter, update) => { parentUpdate = { filter, update }; return { matchedCount: 1 }; }
  });
  mockMethods(t, Student, {
    findOne: (filter) => {
      studentFilter = filter;
      return { select: () => ({ populate: async () => ({ _id: "student-2", name: "Student Two", rollNo: "R-200" }) }) };
    }
  });

  const response = makeResponse();
  await parentController.linkStudent({ body: { rollNo: "R-200" }, user: { id: "parent-1" } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(studentFilter.parentEmail, parent.email);
  assert.deepEqual(parentUpdate.update.$addToSet.students, "student-2");
  assert.equal(parentUpdate.filter.emailVerified, true);
});

test("parent notification reads cannot cross parent account boundaries", async (t) => {
  let notificationFilter;
  mockMethods(t, Parent, {
    findOne: async () => ({ _id: "parent-1", status: "active", emailVerified: true })
  });
  mockMethods(t, ParentNotification, {
    findOneAndUpdate: async (filter) => { notificationFilter = filter; return null; }
  });

  const response = makeResponse();
  await parentController.markNotificationRead({
    params: { id: "notification-owned-by-someone-else" },
    user: { id: "parent-1" }
  }, response);
  assert.equal(response.statusCode, 404);
  assert.deepEqual(notificationFilter, {
    _id: "notification-owned-by-someone-else",
    parent: "parent-1"
  });
});

test("parent gatepass decisions require an active linked parent and pending-parent state", async (t) => {
  const parent = { _id: "parent-1", students: ["student-1"] };
  let transitionFilter;
  let transitionUpdate;
  mockMethods(t, Parent, {
    findOne: () => ({ select: async () => parent })
  });
  mockMethods(t, Gatepass, {
    findOneAndUpdate: async (filter, update) => {
      transitionFilter = filter;
      transitionUpdate = update;
      return { _id: "pass-1", status: "approved", parentDecision: update.$set.parentDecision };
    }
  });

  const response = makeResponse();
  await gatepassController.decideGatepassByParent({
    params: { id: "pass-1" },
    body: { decision: "approved" },
    user: { id: "parent-1" }
  }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(transitionFilter.status, "parent_pending");
  assert.deepEqual(transitionFilter.student.$in, parent.students);
  assert.equal(transitionUpdate.$set.parentDecision.parent, "parent-1");
  assert.equal(transitionUpdate.$set.parentDecision.decision, "approved");
});

test("gatepass notice is stored in-app and reports when email is unconfigured", async (t) => {
  const smtpNames = ["SMTP_HOST", "SMTP_PORT", "SMTP_FROM", "SMTP_USER", "SMTP_PASSWORD", "APP_PUBLIC_URL", "FRONTEND_URL"];
  const previous = Object.fromEntries(smtpNames.map((name) => [name, process.env[name]]));
  smtpNames.forEach((name) => delete process.env[name]);
  t.after(() => smtpNames.forEach((name) => previous[name] === undefined
    ? delete process.env[name]
    : process.env[name] = previous[name]));

  let parentFilter;
  let noticeFilter;
  mockMethods(t, Parent, {
    find: (filter) => {
      parentFilter = filter;
      return { select() { return this; }, lean: async () => [{ _id: "parent-1", email: "parent@example.test" }] };
    }
  });
  mockMethods(t, ParentNotification, {
    updateOne: async (filter) => { noticeFilter = filter; return { upsertedCount: 1 }; }
  });

  const delivery = await parentNotifications.notifyParents({
    studentId: "student-1",
    studentName: "Student One",
    type: "gatepass-review",
    eventId: "pass-1",
    message: "A gatepass request is ready to review."
  });
  assert.equal(parentFilter.emailVerified, true);
  assert.equal(parentFilter.status, "active");
  assert.equal(noticeFilter.eventId, "pass-1");
  assert.equal(delivery.status, "in_app_only");
  assert.equal(delivery.inAppCreated, 1);
  assert.equal(delivery.emailSent, 0);
});

test("parent email delivery is recorded and sent only once per event", async (t) => {
  const settings = {
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: "587",
    SMTP_FROM: "nexus@example.test",
    APP_PUBLIC_URL: "https://nexus.example.test"
  };
  const previous = Object.fromEntries(Object.keys(settings).map((key) => [key, process.env[key]]));
  Object.assign(process.env, settings);
  t.after(() => Object.keys(settings).forEach((key) => previous[key] === undefined
    ? delete process.env[key]
    : process.env[key] = previous[key]));

  const originalCreateTransport = nodemailer.createTransport;
  let emailCount = 0;
  nodemailer.createTransport = () => ({ sendMail: async () => { emailCount += 1; } });
  t.after(() => { nodemailer.createTransport = originalCreateTransport; });
  mockMethods(t, Parent, {
    find: () => ({ select() { return this; }, lean: async () => [{ _id: "parent-1", email: "parent@example.test" }] })
  });
  mockMethods(t, ParentNotification, {
    updateOne: async () => ({ upsertedCount: 1, modifiedCount: 1 }),
    findOneAndUpdate: async () => ({ _id: "notice-1" })
  });

  const delivery = await parentNotifications.notifyParents({
    studentId: "student-1", studentName: "Student One", type: "attendance-alert",
    eventId: "subject-1-2026-11", message: "A monthly attendance update is ready."
  });
  assert.equal(emailCount, 1);
  assert.equal(delivery.status, "sent");
  assert.equal(delivery.emailSent, 1);
});

test("parent sign-in derives parent role from its account model", async (t) => {
  const password = "parent-login-password";
  const bcrypt = require("bcryptjs");
  const parent = {
    _id: "parent-1",
    name: "Parent One",
    email: "parent@example.test",
    password: await bcrypt.hash(password, 4),
    status: "active",
    emailVerified: true
  };
  mockMethods(t, Student, { findOne: async () => null });
  mockMethods(t, Teacher, { findOne: async () => null });
  mockMethods(t, SecurityPersonnel, { findOne: async () => null });
  mockMethods(t, Parent, { findOne: () => ({ select: async () => parent }) });
  mockMethods(t, Admin, { findOne: async () => null });
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "p".repeat(32);
  t.after(() => previousSecret === undefined
    ? delete process.env.JWT_SECRET
    : process.env.JWT_SECRET = previousSecret);

  const response = makeResponse();
  await authController.login({ body: { email: parent.email, password } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.user.role, "parent");
  assert.ok(response.body.token);
});
