const crypto = require("crypto");

const hashSecret = (secret) => crypto.createHash("sha256").update(secret, "utf8").digest("hex");

const secretsMatch = (providedSecret, storedHash) => {
  if (typeof providedSecret !== "string" || typeof storedHash !== "string") return false;
  const providedHash = Buffer.from(hashSecret(providedSecret), "hex");
  const expectedHash = Buffer.from(storedHash, "hex");
  return expectedHash.length === providedHash.length &&
    crypto.timingSafeEqual(providedHash, expectedHash);
};

const createRegistrationCode = () => `NXS-${crypto.randomBytes(24).toString("hex").toUpperCase()}`;
const createInvitationToken = () => crypto.randomBytes(32).toString("base64url");
const createVerificationToken = () => crypto.randomBytes(32).toString("base64url");

module.exports = {
  hashSecret,
  secretsMatch,
  createRegistrationCode,
  createInvitationToken,
  createVerificationToken
};
