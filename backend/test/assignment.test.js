const test = require("node:test");
const assert = require("node:assert/strict");
const Assignment = require("../models/assignmentModel");
const Submission = require("../models/submissionModel");
const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const Subject = require("../models/subjectModel");
const assignmentController = require("../controllers/assignmentController");

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

test("student assignment list never includes answer keys", async (t) => {
  const assignment = {
    _id: "assignment-1",
    assignmentName: "Unit 1",
    deadline: new Date(Date.now() + 60_000),
    status: "active",
    questions: [{
      question: "One plus one?",
      options: ["1", "2"],
      correctAnswer: "2",
      marks: 3
    }]
  };
  const query = {
    populate() { return this; },
    sort: async () => [assignment]
  };

  mockMethods(t, Student, { findById: async () => ({ _id: "student-1", batch: "batch-1" }) });
  mockMethods(t, Assignment, { find: () => query });
  mockMethods(t, Submission, { find: async () => [] });

  const response = makeResponse();
  await assignmentController.getStudentAssignments({ user: { id: "student-1" } }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.assignments[0].questions, [{
    question: "One plus one?",
    options: ["1", "2"],
    marks: 3
  }]);
  assert.equal(JSON.stringify(response.body).includes("correctAnswer"), false);
});

test("teacher can publish validated questions to an assigned subject", async (t) => {
  const teacherId = "64b000000000000000000001";
  const subjectId = "64b000000000000000000002";
  let subjectFilter;
  let createdAssignment;
  mockMethods(t, Teacher, { findById: async () => ({ _id: teacherId }) });
  mockMethods(t, Subject, {
    findOne: async (filter) => {
      subjectFilter = filter;
      return { _id: subjectId, batch: "batch-1" };
    }
  });
  mockMethods(t, Assignment, {
    countDocuments: async () => 4,
    create: async (data) => { createdAssignment = data; return data; }
  });

  const response = makeResponse();
  await assignmentController.createAssignment({
    user: { id: teacherId },
    body: {
      subject: subjectId,
      assignmentName: "  Unit 1 Quiz  ",
      deadline: new Date(Date.now() + 60_000).toISOString(),
      questions: [{
        question: "One plus one?",
        options: ["1", "2"],
        correctAnswer: "2",
        marks: 3
      }]
    }
  }, response);

  assert.equal(response.statusCode, 201);
  assert.deepEqual(subjectFilter, { teacher: teacherId, _id: subjectId });
  assert.equal(createdAssignment.assignmentName, "Unit 1 Quiz");
  assert.equal(createdAssignment.totalMarks, 3);
});

test("assignment creation rejects malformed question keys and past deadlines", async (t) => {
  let teacherLookups = 0;
  mockMethods(t, Teacher, { findById: async () => { teacherLookups += 1; return null; } });

  const invalidQuestion = makeResponse();
  await assignmentController.createAssignment({
    user: { id: "teacher-1" },
    body: {
      deadline: new Date(Date.now() + 60_000).toISOString(),
      questions: [{ question: "One plus one?", options: ["1", "2"], correctAnswer: "3" }]
    }
  }, invalidQuestion);
  assert.equal(invalidQuestion.statusCode, 400);

  const pastDeadline = makeResponse();
  await assignmentController.createAssignment({
    user: { id: "teacher-1" },
    body: {
      deadline: new Date(Date.now() - 60_000).toISOString(),
      questions: [{ question: "One plus one?", options: ["1", "2"], correctAnswer: "2" }]
    }
  }, pastDeadline);
  assert.equal(pastDeadline.statusCode, 400);
  assert.equal(teacherLookups, 0);
});

test("assignment submission rejects expired deadlines and invalid options", async (t) => {
  const assignment = {
    _id: "assignment-1",
    batch: "batch-1",
    status: "active",
    deadline: new Date(Date.now() + 60_000),
    questions: [{ question: "One plus one?", options: ["1", "2"], correctAnswer: "2", marks: 3 }]
  };
  mockMethods(t, Assignment, { findById: async () => assignment });
  mockMethods(t, Student, {
    findById: () => ({ select: async () => ({ batch: "batch-1" }) })
  });
  let submissionsCreated = 0;
  mockMethods(t, Submission, {
    findOne: async () => null,
    create: async () => { submissionsCreated += 1; }
  });

  const invalid = makeResponse();
  await assignmentController.submitAssignment({
    body: { assignmentId: "assignment-1", answers: [{ questionIndex: 0, selectedAnswer: "not-an-option" }] },
    user: { id: "student-1" }
  }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(submissionsCreated, 0);

  assignment.deadline = new Date(Date.now() - 1);
  const expired = makeResponse();
  await assignmentController.submitAssignment({
    body: { assignmentId: "assignment-1", answers: [] },
    user: { id: "student-1" }
  }, expired);
  assert.equal(expired.statusCode, 409);
  assert.match(expired.body.message, /deadline/i);
  assert.equal(submissionsCreated, 0);
});

test("concurrent duplicate submission reports conflict", async (t) => {
  const assignment = {
    _id: "assignment-1",
    batch: "batch-1",
    status: "active",
    deadline: new Date(Date.now() + 60_000),
    questions: [{ question: "One plus one?", options: ["1", "2"], correctAnswer: "2", marks: 3 }]
  };
  mockMethods(t, Assignment, { findById: async () => assignment });
  mockMethods(t, Student, {
    findById: () => ({ select: async () => ({ batch: "batch-1" }) })
  });
  mockMethods(t, Submission, {
    findOne: async () => null,
    create: async () => { const error = new Error("duplicate key"); error.code = 11000; throw error; }
  });

  const response = makeResponse();
  await assignmentController.submitAssignment({
    body: { assignmentId: "assignment-1", answers: [{ questionIndex: 0, selectedAnswer: "2" }] },
    user: { id: "student-1" }
  }, response);

  assert.equal(response.statusCode, 409);
  assert.match(response.body.message, /already submitted/i);
});
