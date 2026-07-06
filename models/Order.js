const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: String, // snapshot at time of billing
    brandName: String,
    price: Number, // snapshot of rate at time of billing
    quantity: { type: Number, required: true, min: 1 },
    subtotal: Number,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customerDetails: {
      name: String,
      phone: { type: String, required: true },
      email: { type: String, required: true },
      address: String,
    },
    items: [orderItemSchema],
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["cod", "online"], default: "cod" },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    orderStatus: { type: String, enum: ["received", "processing", "ready", "completed", "cancelled"], default: "received" },
    seenByOwner: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
