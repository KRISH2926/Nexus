const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true
    },
    message: {
      type: String,
      required: true
    },
    month: Number,
    year: Number,
    type: {
      type: String,
      default: "low-attendance"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);