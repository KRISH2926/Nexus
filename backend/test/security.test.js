const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const getJwtSecret = require("../config/jwtSecret");
const authMiddleware = require("../middleware/authMiddleware");
const Gatepass = require("../models/gatepassModel");
const Parent = require("../models/parentModel");
const gatepassController = require("../controllers/gatepassController");
const parentNotifications = require("../services/parentNotifications");

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

test("JWT secret rejects missing and weak values", () => {
  const previousSecret = process.env.JWT_SECRET;

  try {
    delete process.env.JWT_SECRET;
    assert.throws(getJwtSecret, /at least 32 bytes/);

    process.env.JWT_SECRET = "too-short";
    assert.throws(getJwtSecret, /at least 32 bytes/);

    process.env.JWT_SECRET = "a".repeat(32);
    assert.equal(getJwtSecret(), process.env.JWT_SECRET);
  } finally {
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  }
});

test("JWT middleware requires a valid token and enforces roles", (t) => {
  const secret = "s".repeat(32);
  const previousSecret = process.env.JWT_SECRET;
  t.after(() => {
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  });

  const response = makeResponse();
  let nextCalled = false;

  authMiddleware.verifyToken(
    { headers: {} },
    response,
    () => {
      nextCalled = true;
    }
  );
  assert.equal(response.statusCode, 401);
  assert.equal(nextCalled, false);

  const req = {
    headers: {
      authorization: `Bearer ${jwt.sign({ id: "teacher-1", role: "teacher" }, secret)}`
    }
  };
  process.env.JWT_SECRET = secret;

  authMiddleware.verifyToken(req, makeResponse(), () => {
    nextCalled = true;
  });
  assert.equal(req.user.id, "teacher-1");

  const forbidden = makeResponse();
  authMiddleware.authorizeRoles("admin")(
    req,
    forbidden,
    () => assert.fail("non-admin must not continue")
  );
  assert.equal(forbidden.statusCode, 403);
});

test("gatepass approval is restricted to its mentor and pending state", async (t) => {
  const originalFindById = Gatepass.findById;
  const originalFindOneAndUpdate = Gatepass.findOneAndUpdate;
  const originalParentExists = Parent.exists;
  const originalNotify = parentNotifications.notifyParents;
  let updates = 0;
  let status = "pending";
  let verifiedParent = false;
  Gatepass.findById = async () => ({
    _id: "pass-1",
    mentor: { toString: () => "mentor-1" },
    get status() {
      return status;
    }
  });
  Gatepass.findOneAndUpdate = async (filter, update) => {
    updates += 1;
    assert.equal(filter.mentor, "mentor-1");
    assert.equal(filter.status, "pending");
    status = update.$set.status;
    return { _id: "pass-1", status };
  };
  Parent.exists = async () => verifiedParent ? { _id: "parent-1" } : null;
  parentNotifications.notifyParents = async () => ({ status: "in_app_only" });
  t.after(() => {
    Gatepass.findById = originalFindById;
    Gatepass.findOneAndUpdate = originalFindOneAndUpdate;
    Parent.exists = originalParentExists;
    parentNotifications.notifyParents = originalNotify;
  });

  const denied = makeResponse();
  await gatepassController.approveGatepass(
    { params: { id: "pass-1" }, user: { id: "mentor-2" } },
    denied
  );
  assert.equal(denied.statusCode, 403);
  assert.equal(updates, 0);

  const noParent = makeResponse();
  await gatepassController.approveGatepass(
    { params: { id: "pass-1" }, user: { id: "mentor-1" } },
    noParent
  );
  assert.equal(noParent.statusCode, 409);
  assert.equal(updates, 0);

  verifiedParent = true;
  const approved = makeResponse();
  await gatepassController.approveGatepass(
    { params: { id: "pass-1" }, user: { id: "mentor-1" } },
    approved
  );
  assert.equal(approved.statusCode, 200);
  assert.equal(status, "parent_pending");

  const repeated = makeResponse();
  await gatepassController.rejectGatepass(
    { params: { id: "pass-1" }, user: { id: "mentor-1" } },
    repeated
  );
  assert.equal(repeated.statusCode, 409);
  assert.equal(updates, 1);
});

test("student gatepass requests enter assigned-teacher review", async (t) => {
  const originalFindByIdStudent = require("../models/studentModel").findById;
  const originalFindOneTeacher = require("../models/teacherModel").findOne;
  const originalFindOneGatepass = Gatepass.findOne;
  const originalCreate = Gatepass.create;
  require("../models/studentModel").findById = async () => ({
    _id: "student-1", batch: "batch-1", name: "Student One"
  });
  require("../models/teacherModel").findOne = async () => ({ _id: "mentor-1" });
  Gatepass.findOne = async () => null;
  Gatepass.create = async (data) => ({ ...data, _id: "pass-1", populate: async () => {} });
  t.after(() => {
    require("../models/studentModel").findById = originalFindByIdStudent;
    require("../models/teacherModel").findOne = originalFindOneTeacher;
    Gatepass.findOne = originalFindOneGatepass;
    Gatepass.create = originalCreate;
  });

  const response = makeResponse();
  await gatepassController.createGatepass({
    body: { reason: "Medical appointment", date: new Date(Date.now() + 60_000).toISOString() },
    user: { id: "student-1" }
  }, response);
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.message, "Gatepass sent to mentor");
});
