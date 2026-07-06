require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const brandRoutes = require("./routes/brandRoutes");
const orderRoutes = require("./routes/orderRoutes");
const contactRoutes = require("./routes/contactRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const botRoutes = require("./routes/botRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // disabled so inline scripts in HTML pages work
  })
);

// ── CORS ─────────────────────────────────────────────────────────────────────
// Allow same-origin requests only in production; open in development
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5000", "http://127.0.0.1:5000"];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g., mobile apps, curl, same-origin fetches)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Stricter limit on auth routes to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 login attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again after 15 minutes." },
});

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,            // 200 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});

app.use("/api/", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ── Shop info endpoint ────────────────────────────────────────────────────────
// Feeds permanent contact details + social links into every page from one place.
app.get("/api/shop-info", (req, res) => {
  res.json({
    shopName: process.env.OWNER_SHOP_NAME || "Shri Krishna Lighthouse Bhonti",
    ownerName: process.env.OWNER_NAME || "Anubhav Kanthariya",
    email: process.env.OWNER_EMAIL || "anubhavkanthariya@gmail.com",
    phone: process.env.OWNER_PHONE || "8519075190",
    social: {
      instagram: process.env.SOCIAL_INSTAGRAM || "https://instagram.com/annu.0308",
      facebook: process.env.SOCIAL_FACEBOOK || "https://facebook.com/annu.0308",
      youtube: process.env.SOCIAL_YOUTUBE || "https://youtube.com/@annu.0308",
      linkedin: process.env.SOCIAL_LINKEDIN || "https://linkedin.com/in/annu.0308",
      twitter: process.env.SOCIAL_TWITTER || "https://twitter.com/annu.0308",
    },
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/bot", botRoutes);
app.use("/api/upload", uploadRoutes);

// ── 404 handler for unmatched API routes ─────────────────────────────────────
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.originalUrl}` });
});

// ── Static frontend ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html for all non-API routes (SPA fallback)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Global error handler ─────────────────────────────────────────────────────
// Catches any error thrown by route handlers (i.e. next(err) or async throws)
// and returns a clean JSON response so the server never leaks a stack trace.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[Server Error]", err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || "An unexpected server error occurred.",
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Shri Krishna Lighthouse Bhonti server running at http://localhost:${PORT}`);
  });
});
