const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shri_krishna_lighthouse";
  try {
    await mongoose.connect(uri);
    // Mask password in log output so credentials never appear in server logs.
    const safeUri = uri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
    console.log("MongoDB connected:", safeUri);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.error("Check your MONGO_URI in .env — local MongoDB or Atlas connection string.");
    process.exit(1);
  }
}

module.exports = connectDB;
