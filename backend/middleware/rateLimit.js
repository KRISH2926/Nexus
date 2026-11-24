const windows = new Map();

const rateLimit = ({ limit, windowMs }) => (req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  let window = windows.get(key);

  if (!window || window.expiresAt <= now) {
    window = { count: 0, expiresAt: now + windowMs };
    windows.set(key, window);
  }

  if (windows.size > 10000) {
    for (const [address, entry] of windows) {
      if (entry.expiresAt <= now) windows.delete(address);
    }
  }

  window.count += 1;
  res.set("RateLimit-Limit", String(limit));
  res.set("RateLimit-Remaining", String(Math.max(0, limit - window.count)));
  if (window.count > limit) {
    res.set("Retry-After", String(Math.ceil((window.expiresAt - now) / 1000)));
    return res.status(429).json({ message: "Too many requests. Please try again later." });
  }
  next();
};

module.exports = rateLimit;
