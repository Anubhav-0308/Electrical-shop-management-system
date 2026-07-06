const express = require("express");
const Review = require("../models/Review");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Get reviews (optionally for one product, otherwise general shop reviews)
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.product) filter.product = req.query.product;
    else if (req.query.general === "true") filter.product = null;
    const reviews = await Review.find(filter).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch reviews.", error: err.message });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const filter = {};
    if (req.query.product) filter.product = req.query.product;
    const reviews = await Review.find(filter);
    const count = reviews.length;
    const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    res.json({ count, average: Math.round(avg * 10) / 10 });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch review summary.", error: err.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const { product, rating, comment } = req.body;

    // Server-side rating validation (in addition to Mongoose min/max)
    const parsedRating = parseInt(rating, 10);
    if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: "Rating must be a number between 1 and 5." });
    }

    const review = await Review.create({
      user: req.user.id,
      userName: req.user.name,
      product: product || null,
      rating: parsedRating,
      comment: (comment || "").trim(),
    });
    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ message: "Could not submit review.", error: err.message });
  }
});

module.exports = router;
