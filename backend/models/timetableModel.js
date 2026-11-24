const mongoose = require("mongoose");

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const timetableSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true
    },
    day: {
      type: String,
      enum: DAYS,
      required: true
    },
    startTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format"]
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format"]
    }
  },
  { timestamps: true }
);

timetableSchema.index({ day: 1, startTime: 1, endTime: 1 });
timetableSchema.index({ teacher: 1, day: 1 });
timetableSchema.index({ batch: 1, day: 1 });

module.exports = mongoose.model("Timetable", timetableSchema);
module.exports.DAYS = DAYS;
