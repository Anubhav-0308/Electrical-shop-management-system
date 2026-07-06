const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Modular Switch 6A"
    category: { type: String, required: true, trim: true }, // e.g. "switch", "5-pin-socket", "wire", "mcb", "led-bulb"
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
    price: { type: Number, required: true }, // owner-fixed rate, can change any time
    unit: { type: String, default: "pcs" }, // pcs, meter, box
    image: { type: String, default: "/src/images/placeholder-product.svg" },
    description: { type: String, default: "" },
    inStock: { type: Boolean, default: true },
    featured: { type: Boolean, default: false }, // shown in the scrolling hero banner
  },
  { timestamps: true }
);

productSchema.index({ name: "text", category: "text", description: "text" });

module.exports = mongoose.model("Product", productSchema);
