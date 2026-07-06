const express = require("express");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// GET /api/products?search=switch&category=switch&brand=<id>&featured=true
router.get("/", async (req, res) => {
  try {
    const { search, category, brand, featured } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (featured) filter.featured = featured === "true";
    if (search) {
      const Brand = require("../models/Brand");
      const matchedBrands = await Brand.find({ name: { $regex: search, $options: "i" } }).select("_id");
      const brandIds = matchedBrands.map(b => b._id);
      
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];

      if (brandIds.length > 0) {
        filter.$or.push({ brand: { $in: brandIds } });
      }
    }
    const products = await Product.find(filter).populate("brand", "name logo").sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch products.", error: err.message });
  }
});

// Distinct category list — used to build the "click a category" browsing UI
router.get("/categories", async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch categories.", error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("brand", "name logo");
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch product.", error: err.message });
  }
});

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { name, category, price } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Product name is required." });
    if (!category || !category.trim()) return res.status(400).json({ message: "Category is required." });
    if (price === undefined || isNaN(price) || Number(price) < 0) {
      return res.status(400).json({ message: "A valid price is required." });
    }
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: "Could not add product.", error: err.message });
  }
});

// Owner can change the rate (or anything else) at any time
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Could not update product.", error: err.message });
  }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json({ message: "Product deleted." });
  } catch (err) {
    res.status(500).json({ message: "Could not delete product.", error: err.message });
  }
});

module.exports = router;
