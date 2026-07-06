const express = require("express");
const Brand = require("../models/Brand");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const brands = await Brand.find().sort({ name: 1 });
    res.json(brands);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch brands.", error: err.message });
  }
});

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { name, logo } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Brand name is required." });
    const brand = await Brand.create({ name: name.trim(), logo: logo || undefined });
    res.status(201).json(brand);
  } catch (err) {
    res.status(400).json({ message: "Could not add brand.", error: err.message });
  }
});

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!brand) return res.status(404).json({ message: "Brand not found." });
    res.json(brand);
  } catch (err) {
    res.status(500).json({ message: "Could not update brand.", error: err.message });
  }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const brand = await Brand.findByIdAndDelete(req.params.id);
    if (!brand) return res.status(404).json({ message: "Brand not found." });
    res.json({ message: "Brand deleted." });
  } catch (err) {
    res.status(500).json({ message: "Could not delete brand.", error: err.message });
  }
});

module.exports = router;
