const nodemailer = require("nodemailer");
const Parent = require("../models/parentModel");
const ParentNotification = require("../models/parentNotificationModel");
const { isConfigured } = require("./verificationEmail");

const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[character]));

const deliverNotice = async (parent, studentName, message) => {
  if (!isConfigured()) return "not_configured";
  const port = Number(process.env.SMTP_PORT);
  const transportOptions = {
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465
  };
  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    transportOptions.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD };
  }
  const origin = (process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || "").replace(/\/+$/, "");
  const transporter = nodemailer.createTransport(transportOptions);
  const displayStudentName = studentName || "Your linked student";
  const safeStudentName = escapeHtml(displayStudentName);
  const safeMessage = escapeHtml(message);
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: parent.email,
    subject: "A NEXUS campus update is ready",
    text: `${displayStudentName}: ${message}\n\nSign in to review it in NEXUS: ${origin}/parent`,
    html: `<p>${safeStudentName}: ${safeMessage}</p><p><a href="${origin}/parent">Sign in to NEXUS to review</a></p>`
  });
  return "sent";
};

exports.notifyParents = async ({ studentId, studentName, type, eventId, message }) => {
  const result = {
    status: "no_verified_parent",
    parentCount: 0,
    inAppCreated: 0,
    emailConfigured: isConfigured(),
    emailSent: 0,
    emailPreviouslySent: 0,
    emailFailed: 0,
    emailPending: 0,
    alreadyNotified: 0
  };
  try {
    const parents = await Parent.find({
      students: studentId,
      status: "active",
      emailVerified: true
    }).select("_id email").lean();
    result.parentCount = parents.length;
    if (!parents.length) return result;

    for (const parent of parents) {
      const created = await ParentNotification.updateOne(
        { parent: parent._id, type, eventId },
        { $setOnInsert: {
          parent: parent._id,
          student: studentId,
          type,
          eventId,
          message,
          emailStatus: result.emailConfigured ? "pending" : "not_configured"
        } },
        { upsert: true }
      );
      if (created.upsertedCount) result.inAppCreated += 1;
      else result.alreadyNotified += 1;
      if (!result.emailConfigured) continue;

      const claim = await ParentNotification.findOneAndUpdate(
        { parent: parent._id, type, eventId, emailStatus: { $in: ["pending", "failed", "not_configured"] } },
        { $set: { emailStatus: "sending" } },
        { new: true }
      );
      if (!claim) {
        const existing = await ParentNotification.findOne(
          { parent: parent._id, type, eventId }
        ).select("emailStatus").lean();
        if (existing?.emailStatus === "sent") result.emailPreviouslySent += 1;
        else result.emailPending += 1;
        continue;
      }
      try {
        await deliverNotice(parent, studentName, message);
        await ParentNotification.updateOne(
          { _id: claim._id, emailStatus: "sending" },
          { $set: { emailStatus: "sent", emailSentAt: new Date() } }
        );
        result.emailSent += 1;
      } catch {
        await ParentNotification.updateOne(
          { _id: claim._id, emailStatus: "sending" },
          { $set: { emailStatus: "failed" } }
        ).catch(() => {});
        result.emailFailed += 1;
      }
    }

    result.status = result.emailSent + result.emailPreviouslySent === result.parentCount
      ? "sent"
      : result.inAppCreated > 0
        ? "in_app_only"
        : result.emailPending > 0
          ? "pending"
          : result.alreadyNotified === result.parentCount
            ? "already_notified"
            : "failed";
    return result;
  } catch {
    return { ...result, status: "failed" };
  }
};
