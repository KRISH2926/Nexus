const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },

  options: {
    type: [String],
    required: true,
  },

  correctAnswer: {
    type: String,
    required: true,
  },

  marks: {
    type: Number,
    default: 1,
  },
});

const assignmentSchema = new mongoose.Schema(
  {
    assignmentName: {
      type: String,
      required: true,
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },

    questions: [questionSchema],

    deadline: {
      type: Date,
      required: true,
    },

    totalMarks: {
      type: Number,
      default: 10,
    },

    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Assignment", assignmentSchema);