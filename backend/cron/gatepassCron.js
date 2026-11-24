const cron = require("node-cron");
const Gatepass = require("../models/gatepassModel");

cron.schedule("*/5 * * * *", async () => {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  try {
    await Gatepass.updateMany(
      { status: { $in: ["pending", "parent_pending", "approved"] }, date: { $lt: endOfToday } },
      { $set: { status: "expired" } }
    );
    await Gatepass.updateMany(
      { status: "issued", expiresAt: { $lte: now } },
      { $set: { status: "expired" }, $unset: { qrTokenHash: 1 } }
    );
  } catch {
    console.error("Gatepass expiry sweep failed.");
  }
});
