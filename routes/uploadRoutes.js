const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// ── Ensure upload directory exists ────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "..", "public", "src", "images");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Multer config ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // Sanitise original name + unique timestamp prefix so files never clash
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 40);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only image files are allowed (jpg, png, webp, gif, svg)."), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// POST /api/upload/product-image  (admin only)
router.post("/product-image", protect, adminOnly, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image file received." });
  }
  // Return the public URL path that the browser can use
  const publicPath = `/src/images/${req.file.filename}`;
  res.json({ url: publicPath, filename: req.file.filename });
});

module.exports = router;
