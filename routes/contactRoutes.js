const express = require("express");
const Contact = require("../models/Contact");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !phone || !message) {
      return res.status(400).json({ message: "Please fill in name, email, phone and message." });
    }
    const contact = await Contact.create({ name, email, phone, message });
    res.status(201).json({ message: "Your message has been sent to the owner.", contact });
  } catch (err) {
    res.status(500).json({ message: "Could not send message.", error: err.message });
  }
});

router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch messages.", error: err.message });
  }
});

router.put("/:id/seen", protect, adminOnly, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { seenByOwner: true },
      { new: true }
    );
    if (!contact) return res.status(404).json({ message: "Message not found." });
    res.json(contact);
  } catch (err) {
    res.status(500).json({ message: "Could not update message.", error: err.message });
  }
});

module.exports = router;
