const jwt = require("jsonwebtoken");

function protect(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Please log in first." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, name, email }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Your session has expired. Please log in again." });
  }
}

function adminOnly(req, res, next) {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ message: "Only the shop owner can do this." });
}

module.exports = { protect, adminOnly };
