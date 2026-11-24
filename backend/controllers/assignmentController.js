const Assignment = require("../models/assignmentModel");
const Submission = require("../models/submissionModel");
const Teacher = require("../models/teacherModel");
const Student = require("../models/studentModel");
const Subject = require("../models/subjectModel");
const mongoose = require("mongoose");

const toPlainObject = (document) =>
  typeof document.toObject === "function" ? document.toObject() : { ...document };

const assignmentHasClosed = (assignment, now = Date.now()) =>
  assignment.status === "closed" || new Date(assignment.deadline).getTime() <= now;

/* ================= CREATE ASSIGNMENT ================= */

exports.createAssignment = async (req, res) => {
  try {
    const { deadline, questions, subject: subjectId } = req.body;

    const parsedDeadline = new Date(deadline);
    if (!deadline || Number.isNaN(parsedDeadline.getTime()) || parsedDeadline <= new Date()) {
      return res.status(400).json({ success: false, message: "A future deadline is required" });
    }

    if (
      !Array.isArray(questions) ||
      questions.length === 0 ||
      questions.length > 100 ||
      questions.some((question) =>
        !question ||
        typeof question.question !== "string" ||
        !question.question.trim() ||
        !Array.isArray(question.options) ||
        question.options.length < 2 ||
        question.options.some((option) => typeof option !== "string" || !option.trim()) ||
        !question.options.includes(question.correctAnswer) ||
        (question.marks !== undefined &&
          (!Number.isFinite(Number(question.marks)) || Number(question.marks) <= 0))
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide 1 to 100 valid questions with at least two options and a correct answer",
      });
    }

    if (subjectId && !mongoose.isValidObjectId(subjectId)) {
      return res.status(400).json({ success: false, message: "Invalid subject" });
    }

    const teacher = await Teacher.findById(req.user.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const subject = await Subject.findOne({
      teacher: teacher._id,
      ...(subjectId ? { _id: subjectId } : {}),
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "No subject assigned to teacher",
      });
    }

    const assignmentCount =
      await Assignment.countDocuments({
        subject: subject._id,
      });

    const assignment =
      await Assignment.create({
        assignmentName:
          typeof req.body.assignmentName === "string" && req.body.assignmentName.trim()
            ? req.body.assignmentName.trim().slice(0, 120)
            : `Assignment ${assignmentCount + 1}`,
        teacher: teacher._id,
        subject: subject._id,
        batch: subject.batch,
        questions,
        deadline: parsedDeadline,
        totalMarks: questions.reduce((total, question) => total + Number(question.marks || 1), 0),
      });

    res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      assignment,
    });

  } catch (error) {
    console.error("Create Assignment Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= STUDENT ASSIGNMENTS ================= */

exports.getStudentAssignments = async (
  req,
  res
) => {
  try {
    const student = await Student.findById(
      req.user.id
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const assignments =
      await Assignment.find({
        batch: student.batch,
      })
        .populate("subject")
        .sort({ createdAt: -1 });

    const submissions =
      await Submission.find({
        student: student._id,
      });

    const formattedAssignments =
      assignments.map((assignment) => {
        const submission =
          submissions.find(
            (s) =>
              s.assignment.toString() ===
              assignment._id.toString()
          );

        let status = "pending";

        if (submission) {
          status = "submitted";
        } else if (assignmentHasClosed(assignment)) {
          status = "missed";
        }

        const studentAssignment = toPlainObject(assignment);
        studentAssignment.questions = studentAssignment.questions.map(
          ({ question, options, marks }) => ({ question, options, marks })
        );

        return {
          ...studentAssignment,
          submitted: !!submission,
          score: submission
            ? submission.score
            : 0,
          status,
        };
      });

    res.status(200).json({
      success: true,
      assignments:
        formattedAssignments,
    });

  } catch (error) {
    console.error(
      "Get Assignments Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= SUBMIT ASSIGNMENT ================= */

exports.submitAssignment = async (
  req,
  res
) => {
  try {
    const { assignmentId, answers } =
      req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "Answers must be an array",
      });
    }

    const assignment =
      await Assignment.findById(
        assignmentId
      );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    const student = await Student.findById(req.user.id).select("batch");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (assignment.batch.toString() !== student.batch.toString()) {
      return res.status(403).json({
        success: false,
        message: "Assignment is not available to this student",
      });
    }

    if (assignmentHasClosed(assignment)) {
      return res.status(409).json({
        success: false,
        message: assignment.status === "closed"
          ? "Assignment is closed"
          : "Assignment deadline has passed",
      });
    }

    const seenQuestionIndexes = new Set();
    const invalidAnswer = answers.some((answer) => {
      if (
        !answer ||
        !Number.isInteger(answer.questionIndex) ||
        answer.questionIndex < 0 ||
        answer.questionIndex >= assignment.questions.length ||
        seenQuestionIndexes.has(answer.questionIndex) ||
        typeof answer.selectedAnswer !== "string"
      ) {
        return true;
      }

      seenQuestionIndexes.add(answer.questionIndex);
      return !assignment.questions[answer.questionIndex].options.includes(
        answer.selectedAnswer
      );
    });

    if (invalidAnswer) {
      return res.status(400).json({
        success: false,
        message: "Answers must reference a question and one of its available options",
      });
    }

    let score = 0;

    assignment.questions.forEach(
      (question, index) => {
        const submittedAnswer =
          answers.find(
            (a) =>
              a.questionIndex === index
          );

        if (
          submittedAnswer &&
          submittedAnswer.selectedAnswer ===
            question.correctAnswer
        ) {
          score += question.marks;
        }
      }
    );

    const existingSubmission =
      await Submission.findOne({
        assignment: assignmentId,
        student: req.user.id,
      });

    if (existingSubmission) {
      return res.status(409).json({
        success: false,
        message:
          "Assignment already submitted",
      });
    }

    const submission =
      await Submission.create({
        assignment: assignmentId,
        student: req.user.id,
        answers,
        score,
        status: "submitted",
      });

    res.status(201).json({
      success: true,
      score,
      submission,
    });

  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Assignment already submitted",
      });
    }

    console.error(
      "Submit Assignment Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
/* ================= TEACHER ASSIGNMENT RESULTS ================= */

exports.getAssignmentResults = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await Assignment.findById(
      assignmentId
    )
      .populate("subject")
      .populate("batch");

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    if (assignment.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const allStudents = await Student.find({
      batch: assignment.batch,
    }).select("name rollNo");

    const submissions = await Submission.find({
      assignment: assignmentId,
    }).populate("student", "name rollNo");

    const submittedStudents = submissions.map(
      (submission) => ({
        _id: submission.student._id,
        name: submission.student.name,
        rollNo: submission.student.rollNo,
        score: submission.score,
        submittedAt:
          submission.submittedAt,
      })
    );

    const submittedIds =
      submittedStudents.map(
        (student) =>
          student._id.toString()
      );

    const pendingStudents =
      allStudents.filter(
        (student) =>
          !submittedIds.includes(
            student._id.toString()
          )
      );

    const scores =
      submittedStudents.map(
        (student) => student.score
      );

    const analytics = {
      totalStudents:
        allStudents.length,

      submittedCount:
        submittedStudents.length,

      pendingCount:
        pendingStudents.length,

      highestScore:
        scores.length > 0
          ? Math.max(...scores)
          : 0,

      lowestScore:
        scores.length > 0
          ? Math.min(...scores)
          : 0,

      averageScore:
        scores.length > 0
          ? (
              scores.reduce(
                (a, b) => a + b,
                0
              ) / scores.length
            ).toFixed(2)
          : 0,
    };

    res.status(200).json({
      success: true,
      assignment,
      analytics,
      submittedStudents,
      pendingStudents,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
/* ================= TEACHER ASSIGNMENTS ================= */

exports.getTeacherAssignments = async (
  req,
  res
) => {
  try {
    const teacher =
      await Teacher.findById(
        req.user.id
      );

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message:
          "Teacher not found",
      });
    }

    const assignments =
      await Assignment.find({
        teacher: teacher._id,
      })
        .populate("subject")
        .sort({
          createdAt: -1,
        });

    res.status(200).json({
      success: true,
      assignments,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};
