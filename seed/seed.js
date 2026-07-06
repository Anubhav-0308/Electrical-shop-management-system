require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Brand = require("../models/Brand");
const Product = require("../models/Product");

async function seed() {
  await connectDB();

  // 1. Owner / admin account
  const ownerEmail = (process.env.OWNER_EMAIL || "anubhavkanthariya@gmail.com").toLowerCase();
  const ownerUsername = (process.env.OWNER_USERNAME || "anubhavkanthariya").toLowerCase();
  const ownerPassword = process.env.OWNER_PASSWORD || "annu.030807";

  const hashed = await bcrypt.hash(ownerPassword, 12);
  let owner = await User.findOne({ email: ownerEmail });

  if (!owner) {
    owner = await User.create({
      name: process.env.OWNER_NAME || "Anubhav Kanthariya",
      username: ownerUsername,
      email: ownerEmail,
      password: hashed,
      phone: process.env.OWNER_PHONE || "8519075190",
      role: "admin",
    });
    console.log("✅ Owner/admin account created:", ownerEmail);
  } else {
    owner.password = hashed;
    owner.role = "admin";
    owner.username = ownerUsername;
    await owner.save();
    console.log("✅ Owner/admin account refreshed:", ownerEmail);
  }
  // NOTE: Password is intentionally NOT logged to console for security.
  console.log("   Login with email:", ownerEmail, "OR username:", ownerUsername);

  // 2. Sample brands (owner can add more / edit from the dashboard)
  const brandNames = ["Havells", "Anchor", "Polycab", "Finolex", "Philips"];
  const brands = {};
  for (const name of brandNames) {
    let b = await Brand.findOne({ name });
    if (!b) b = await Brand.create({ name });
    brands[name] = b;
  }
  console.log("✅ Brands ready:", brandNames.join(", "));

  // 3. Sample products across a few categories, so the site isn't empty on first run
  const sampleProducts = [
    { name: "1-Way Modular Switch 6A", category: "switch", brand: "Anchor", price: 35, featured: true },
    { name: "2-Way Modular Switch 6A", category: "switch", brand: "Anchor", price: 45 },
    { name: "Fan Regulator Switch", category: "switch", brand: "Havells", price: 120 },
    { name: "5-Pin Socket 6A", category: "5-pin-socket", brand: "Anchor", price: 55, featured: true },
    { name: "5-Pin Socket 16A", category: "5-pin-socket", brand: "Havells", price: 95 },
    { name: "3-Pin Socket with Switch", category: "3-pin-socket", brand: "Polycab", price: 70 },
    { name: "1.5 sq mm Copper Wire (90m coil)", category: "wire", brand: "Finolex", price: 1850, unit: "coil" },
    { name: "2.5 sq mm Copper Wire (90m coil)", category: "wire", brand: "Finolex", price: 2650, unit: "coil" },
    { name: "MCB 16A Single Pole", category: "mcb", brand: "Havells", price: 145, featured: true },
    { name: "MCB 32A Double Pole", category: "mcb", brand: "Havells", price: 380 },
    { name: "9W LED Bulb", category: "led-bulb", brand: "Philips", price: 90 },
    { name: "18W LED Bulb", category: "led-bulb", brand: "Philips", price: 160 },
    { name: "LED Batten Tube Light 20W", category: "tube-light", brand: "Philips", price: 320 },
    { name: "Ceiling Fan 1200mm", category: "fan", brand: "Havells", price: 1650 },
    { name: "Extension Board 4-Socket", category: "extension-board", brand: "Anchor", price: 480 },
  ];

  let added = 0;
  for (const p of sampleProducts) {
    const exists = await Product.findOne({ name: p.name });
    if (!exists) {
      await Product.create({ ...p, brand: brands[p.brand]._id });
      added++;
    }
  }
  console.log(`✅ Products ready: ${sampleProducts.length} total, ${added} newly added.`);

  console.log("\n🎉 Seeding complete. Server is ready to start.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
