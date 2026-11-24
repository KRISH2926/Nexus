const GatepassPolicy = require("../models/gatepassPolicyModel");
const GatepassQuotaUsage = require("../models/gatepassQuotaUsageModel");

const monthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

async function getMonthlyQuota(student) {
  const now = new Date();
  const active = {
    effectiveFrom: { $lte: now },
    $or: [{ effectiveUntil: null }, { effectiveUntil: { $gte: now } }]
  };
  const [studentPolicy, batchPolicy, globalPolicy] = await Promise.all([
    GatepassPolicy.findOne({ ...active, scope: "student", scopeId: student._id }).sort({ effectiveFrom: -1, createdAt: -1 }),
    GatepassPolicy.findOne({ ...active, scope: "batch", scopeId: student.batch }).sort({ effectiveFrom: -1, createdAt: -1 }),
    GatepassPolicy.findOne({ ...active, scope: "global" }).sort({ effectiveFrom: -1, createdAt: -1 })
  ]);
  return studentPolicy?.monthlyQuota ?? batchPolicy?.monthlyQuota ?? globalPolicy?.monthlyQuota ?? 2;
}

async function getUsage(studentId, date = new Date()) {
  const month = monthKey(date);
  const usage = await GatepassQuotaUsage.findOne({ student: studentId, month }).select("issuedCount");
  return { month, issuedCount: usage?.issuedCount || 0 };
}

async function reserveIssuedPass(studentId, month, quota) {
  if (quota <= 0) return false;
  try {
    const result = await GatepassQuotaUsage.updateOne(
      { student: studentId, month, issuedCount: { $lt: quota } },
      { $inc: { issuedCount: 1 }, $setOnInsert: { student: studentId, month } },
      { upsert: true }
    );
    return result.modifiedCount === 1 || result.upsertedCount === 1;
  } catch (error) {
    if (error?.code === 11000) {
      try {
        const retry = await GatepassQuotaUsage.updateOne(
          { student: studentId, month, issuedCount: { $lt: quota } },
          { $inc: { issuedCount: 1 } }
        );
        return retry.modifiedCount === 1;
      } catch (retryError) {
        if (retryError?.code === 11000) return false;
        throw retryError;
      }
    }
    throw error;
  }
}

async function releaseReservedPass(studentId, month) {
  await GatepassQuotaUsage.updateOne(
    { student: studentId, month, issuedCount: { $gt: 0 } },
    { $inc: { issuedCount: -1 } }
  );
}

module.exports = { getMonthlyQuota, getUsage, monthKey, reserveIssuedPass, releaseReservedPass };
