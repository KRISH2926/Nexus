const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher"
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true
    }
  },
  { timestamps: true }
);

// Prevent duplicate subject in same batch
subjectSchema.index({ name: 1, batch: 1 }, { unique: true });

module.exports = mongoose.model("Subject", subjectSchema);