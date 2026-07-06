const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: String,
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, // optional: null = general shop review
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
