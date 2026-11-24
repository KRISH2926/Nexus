const jwt = require("jsonwebtoken");
const getJwtSecret = require("../config/jwtSecret");

// 🔐 VERIFY TOKEN
exports.verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, getJwtSecret());

    req.user = decoded; // { id, role }

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};

// 🎭 ROLE BASED ACCESS
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied: insufficient permissions"
      });
    }
    next();
  };
};
