const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    answers: [
      {
        questionIndex: Number,
        selectedAnswer: String,
      },
    ],

    score: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["submitted", "missed"],
      default: "submitted",
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// One student can submit an assignment only once, including concurrent requests.
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("Submission", submissionSchema);
