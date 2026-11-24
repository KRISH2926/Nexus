const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  rollNo: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  parentName: {
    type: String,
    trim: true
  },
  parentEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  studentMobile: {
    type: String,
    required: true,
    match: [/^[6-9]\d{9}$/, "Enter valid Indian mobile number"]
  },
  parentMobile: {
    type: String,
    required: true,
    match: [/^[6-9]\d{9}$/, "Enter valid Indian mobile number"]
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batch",
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "active", "disabled"]
  },
  emailVerified: {
    type: Boolean
  },
  emailVerificationTokenHash: {
    type: String,
    select: false
  },
  emailVerificationExpiresAt: {
    type: Date,
    select: false
  }
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);