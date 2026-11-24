const MIN_JWT_SECRET_BYTES = 32;

module.exports = function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || Buffer.byteLength(secret, "utf8") < MIN_JWT_SECRET_BYTES) {
    throw new Error("JWT_SECRET must be configured with at least 32 bytes");
  }

  return secret;
};
