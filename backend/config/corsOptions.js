const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function parseOrigin(value, production) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid CORS origin: ${value}`);
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (production && url.protocol !== "https:")
  ) {
    throw new Error(`Invalid CORS origin: ${value}`);
  }

  return url.origin;
}

function isLocalDevelopmentOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

module.exports = function createCorsOptions(env = process.env) {
  const production = env.NODE_ENV === "production";
  const configuredOrigins = (env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (production && configuredOrigins.length === 0) {
    throw new Error("CORS_ORIGINS must list the HTTPS frontend origin in production");
  }

  const allowedOrigins = new Set(
    configuredOrigins.map((origin) => parseOrigin(origin, production))
  );

  return {
    origin(origin, callback) {
      const allowed =
        !origin ||
        allowedOrigins.has(origin) ||
        (!production && isLocalDevelopmentOrigin(origin));

      callback(null, allowed);
    },
    optionsSuccessStatus: 204
  };
};
