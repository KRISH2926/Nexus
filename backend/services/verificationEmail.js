const nodemailer = require("nodemailer");

const isConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
    Number.isInteger(Number(process.env.SMTP_PORT)) &&
    Number(process.env.SMTP_PORT) > 0 &&
    Number(process.env.SMTP_PORT) <= 65535 &&
    process.env.SMTP_FROM &&
    (process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL)
  );

const sendVerificationEmail = async (email, token) => {
  if (!isConfigured()) return false;

  const port = Number(process.env.SMTP_PORT);
  const transportOptions = {
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465
  };
  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    transportOptions.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    };
  }

  const transporter = nodemailer.createTransport(transportOptions);
  const origin = (process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || "").replace(/\/+$/, "");
  const verificationUrl = `${origin}/verify-email?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Verify your Nexus account",
    text: `Use this link to verify your email address: ${verificationUrl}`,
    html: `<p>Use this link to verify your email address:</p><p><a href="${verificationUrl}">Verify email</a></p>`
  });
  return true;
};

module.exports = { isConfigured, sendVerificationEmail };
