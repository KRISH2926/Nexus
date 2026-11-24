export function resolveApiBase(nodeEnv, configuredApiBase) {
  const configured = configuredApiBase && configuredApiBase.trim();
  if (nodeEnv === "production" && configured) {
    const sameOriginPath = configured.startsWith("/") && !configured.startsWith("//");
    let secureAbsoluteUrl = false;
    if (!sameOriginPath) {
      try {
        const url = new URL(configured);
        secureAbsoluteUrl = url.protocol === "https:" && !url.username && !url.password;
      } catch {
        secureAbsoluteUrl = false;
      }
    }
    if (!sameOriginPath && !secureAbsoluteUrl) {
      throw new Error("REACT_APP_API_URL must be a same-origin path or HTTPS URL in production");
    }
  }

  const defaultApiBase = nodeEnv === "production"
    ? "/api"
    : "http://127.0.0.1:5000/api";

  return (configured || defaultApiBase).replace(/\/+$/, "");
}

const API_BASE = resolveApiBase(process.env.NODE_ENV, process.env.REACT_APP_API_URL);

export default API_BASE;
