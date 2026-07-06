const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Register a new customer
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: "An account with this email already exists." });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      phone,
      address,
      role: "customer",
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed.", error: err.message });
  }
});

// Login — accepts email OR username.
// Admin can log in with username "anubhavkanthariya" or their email.
// Role determines which dashboard the frontend redirects to.
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body; // "email" field accepts email or username
    if (!email || !password) {
      return res.status(400).json({ message: "Email/username and password are required." });
    }

    const identifier = email.toLowerCase().trim();

    // Try email first, then username
    let user = await User.findOne({ email: identifier });
    if (!user) {
      user = await User.findOne({ username: identifier });
    }

    if (!user) {
      return res.status(400).json({ message: "No account found with this email or username." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Incorrect password." });

    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, username: user.username, role: user.role, phone: user.phone },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed.", error: err.message });
  }
});

// Current logged-in user's profile
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch profile.", error: err.message });
  }
});

module.exports = router;
