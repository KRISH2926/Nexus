const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
mobile: {
  type: String,
  required: true,
  match: [/^[6-9]\d{9}$/, "Enter valid Indian mobile number"]
},
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batch",
    required: true
  },
  isMentor: {
    type: Boolean,
    default: false
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

module.exports = mongoose.model("Teacher", teacherSchema);