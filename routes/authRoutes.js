const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "mock");

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_APP_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

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
    const existing = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { phone }
      ]
    });
    if (existing) {
      if (existing.email === email.toLowerCase()) {
        return res.status(400).json({ message: "An account with this email already exists." });
      }
      return res.status(400).json({ message: "An account with this phone number already exists." });
    }
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

    // Try email first, then username, then phone
    let user = await User.findOne({ email: identifier });
    if (!user) {
      user = await User.findOne({ username: identifier });
    }
    if (!user) {
      user = await User.findOne({ phone: identifier });
    }

    if (!user || !user.password) {
      return res.status(400).json({ message: "No account found with these credentials or password not set." });
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

// Google Login Endpoint
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Google token is required." });

    let payload;
    if (process.env.GOOGLE_CLIENT_ID) {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } else {
      payload = jwt.decode(token);
    }
    
    if (!payload) return res.status(400).json({ message: "Invalid Google token." });

    const { sub: googleId, email, name } = payload;
    
    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        user.googleId = googleId;
        await user.save();
      } else {
        user = await User.create({
          name,
          email: email.toLowerCase(),
          googleId,
          role: "customer"
        });
      }
    }

    const jwtToken = signToken(user);
    res.json({
      token: jwtToken,
      user: { id: user._id, name: user.name, email: user.email, username: user.username, role: user.role, phone: user.phone },
    });
  } catch (err) {
    res.status(500).json({ message: "Google login failed.", error: err.message });
  }
});

// Forgot Password - Send OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email address is required." });
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "No account found with this email." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpire = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    if (process.env.GMAIL_APP_EMAIL && process.env.GMAIL_APP_PASSWORD) {
      try {
        await transporter.sendMail({
          from: `"Shri Krishna Lighthouse" <${process.env.GMAIL_APP_EMAIL}>`,
          to: user.email,
          subject: "Password Reset OTP",
          text: `Your Shri Krishna Lighthouse OTP is: ${otp}. It is valid for 10 minutes.`,
        });
        console.log(`[EMAIL] Sent OTP to ${user.email}`);
      } catch (emailErr) {
        console.error("[EMAIL ERROR]", emailErr.message);
        return res.status(500).json({ message: "Failed to send OTP via Email.", error: emailErr.message });
      }
    } else {
      console.log(`[MOCK EMAIL] Sending OTP ${otp} to ${user.email}`);
    }
    
    res.json({ message: "OTP sent to your email successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to send OTP.", error: err.message });
  }
});

// Reset Password - Verify OTP & Update Password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required." });
    }
    
    const user = await User.findOne({ 
      email: email.toLowerCase(), 
      resetPasswordOtp: otp, 
      resetPasswordOtpExpire: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    user.password = hashed;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpire = undefined;
    await user.save();

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    res.status(500).json({ message: "Password reset failed.", error: err.message });
  }
});

module.exports = router;
