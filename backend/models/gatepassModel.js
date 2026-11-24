const mongoose = require("mongoose");

const gatepassSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },

    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true
    },

    date: {
      type: Date,
      required: true
    },

    reason: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: ["pending", "parent_pending", "approved", "rejected", "issued", "exited", "returned", "expired", "cancelled", "revoked"],
      default: "pending"
    },

    exitTime: { type: String, match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format"] },
    expectedReturnTime: { type: String, match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format"] },
    details: { type: String, trim: true, maxlength: 500 },

    teacherDecisionAt: {
      type: Date
    },

    parentDecision: {
      parent: { type: mongoose.Schema.Types.ObjectId, ref: "Parent" },
      decision: { type: String, enum: ["approved", "rejected"] },
      decidedAt: { type: Date }
    },

    issuedAt: { type: Date },
    expiresAt: { type: Date },
    qrTokenHash: { type: String, select: false },
    quotaMonth: { type: String },
    exitRecord: {
      security: { type: mongoose.Schema.Types.ObjectId, ref: "SecurityPersonnel" },
      gate: { type: String, trim: true },
      scannedAt: { type: Date },
      scanReference: { type: String }
    },
    returnRecord: {
      security: { type: mongoose.Schema.Types.ObjectId, ref: "SecurityPersonnel" },
      gate: { type: String, trim: true },
      scannedAt: { type: Date },
      scanReference: { type: String }
    }
  },
  { timestamps: true }
);

gatepassSchema.index({ qrTokenHash: 1 }, { unique: true, sparse: true });
gatepassSchema.index({ student: 1, date: -1 });

module.exports = mongoose.model("Gatepass", gatepassSchema);
