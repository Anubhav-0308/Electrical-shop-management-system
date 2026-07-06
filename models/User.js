const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true, // allows null/undefined without unique conflict
      unique: true,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // hashed via bcryptjs
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    role: { type: String, enum: ["admin", "customer"], default: "customer" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
