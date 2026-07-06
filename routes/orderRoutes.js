const express = require("express");
const jwt = require("jsonwebtoken"); // moved to top-level — was incorrectly inline before
const PDFDocument = require("pdfkit");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// ──────────────────────────────────────────────
// IMPORTANT: "/my" MUST come before "/:id" routes
// to prevent Express treating "my" as a MongoDB ObjectId
// ──────────────────────────────────────────────

// A customer's own past bills
router.get("/my", protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch your orders.", error: err.message });
  }
});

// Owner: see every order
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch orders.", error: err.message });
  }
});

// Create an order / generate a bill.
// Body: { items: [{ productId, quantity }], customerDetails: { name, phone, email, address }, paymentMethod }
// Prices are ALWAYS re-fetched from the database on the server — never trusted from the browser,
// so the owner's current rate is what actually gets billed.
router.post("/", async (req, res) => {
  try {
    const { items, customerDetails, paymentMethod } = req.body;
    if (!items || !items.length) return res.status(400).json({ message: "Your cart is empty." });
    if (!customerDetails || !customerDetails.phone || !customerDetails.email) {
      return res.status(400).json({ message: "Phone number and email are required to generate the bill." });
    }

    let total = 0;
    const billItems = [];
    for (const it of items) {
      const product = await Product.findById(it.productId).populate("brand", "name");
      if (!product) return res.status(400).json({ message: "One of the products no longer exists." });
      const quantity = Math.max(1, parseInt(it.quantity, 10) || 1);
      const subtotal = product.price * quantity;
      total += subtotal;
      billItems.push({
        product: product._id,
        name: product.name,
        brandName: product.brand ? product.brand.name : "",
        price: product.price,
        quantity,
        subtotal,
      });
    }

    // Attach logged-in user if a token was sent (optional — guests can also bill)
    let userId = undefined;
    const header = req.headers.authorization || "";
    if (header.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (e) {
        /* guest checkout — ignore invalid/missing token */
      }
    }

    const order = await Order.create({
      user: userId,
      customerDetails,
      items: billItems,
      total,
      paymentMethod: paymentMethod === "online" ? "online" : "cod",
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: "Could not generate the bill.", error: err.message });
  }
});

// Demo payment (stand-in for Razorpay/Stripe — see README to wire up a real gateway)
router.post("/:id/pay", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });
    order.paymentStatus = "paid";
    order.paymentMethod = "online";
    await order.save();
    res.json({ message: "Payment successful.", order });
  } catch (err) {
    res.status(500).json({ message: "Payment failed.", error: err.message });
  }
});

// Update order status (admin only)
router.put("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const validStatuses = ["received", "processing", "ready", "completed", "cancelled"];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ message: "Invalid order status." });
    }
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus, seenByOwner: true },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found." });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Could not update order status.", error: err.message });
  }
});

// Download / print a proper invoice as a PDF
router.get("/:id/invoice", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=invoice-${order._id}.pdf`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text(process.env.OWNER_SHOP_NAME || "Shri Krishna Lighthouse Bhonti", { align: "center" });
    doc.fontSize(10).text(`Owner: ${process.env.OWNER_NAME || ""}  |  Phone: ${process.env.OWNER_PHONE || ""}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice #: ${order._id}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
    doc.text(`Customer: ${order.customerDetails.name || ""}  |  ${order.customerDetails.phone}  |  ${order.customerDetails.email}`);
    doc.moveDown();

    doc.font("Helvetica-Bold");
    doc.text("Item", 40, doc.y, { continued: true, width: 200 });
    doc.text("Brand", 240, doc.y, { continued: true, width: 100 });
    doc.text("Rate", 340, doc.y, { continued: true, width: 60 });
    doc.text("Qty", 400, doc.y, { continued: true, width: 40 });
    doc.text("Subtotal", 450, doc.y);
    doc.font("Helvetica");
    doc.moveDown(0.5);

    order.items.forEach((item) => {
      const y = doc.y;
      doc.text(item.name, 40, y, { width: 200 });
      doc.text(item.brandName || "-", 240, y, { width: 100 });
      doc.text(`Rs. ${item.price}`, 340, y, { width: 60 });
      doc.text(String(item.quantity), 400, y, { width: 40 });
      doc.text(`Rs. ${item.subtotal}`, 450, y);
      doc.moveDown(0.3);
    });

    doc.moveDown();
    doc.font("Helvetica-Bold").text(`Total: Rs. ${order.total}`, { align: "right" });
    doc.font("Helvetica").fontSize(10);
    doc.text(`Payment: ${order.paymentMethod.toUpperCase()} — ${order.paymentStatus.toUpperCase()}`, { align: "right" });
    doc.moveDown();
    doc.fontSize(9).text("Thank you for shopping with us!", { align: "center" });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: "Could not generate invoice.", error: err.message });
  }
});

module.exports = router;
