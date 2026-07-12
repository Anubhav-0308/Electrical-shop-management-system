require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

// The paths to the images (assuming they are placed in public/src/images/)
const SWITCH_IMAGE_PATH = "/src/images/black-switch.png";
const SOCKET_IMAGE_PATH = "/src/images/black-socket.png";

async function updateImages() {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shri_krishna_lighthouse";
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    // Update all switches
    const switchResult = await Product.updateMany(
      { category: "switch" },
      { $set: { image: SWITCH_IMAGE_PATH } }
    );
    console.log(`Updated ${switchResult.modifiedCount} switch products.`);

    // Update all sockets
    const socketResult = await Product.updateMany(
      { category: { $in: ["socket", "5-pin-socket"] } },
      { $set: { image: SOCKET_IMAGE_PATH } }
    );
    console.log(`Updated ${socketResult.modifiedCount} socket products.`);

    console.log("Done updating images!");
    process.exit(0);
  } catch (err) {
    console.error("Error updating images:", err);
    process.exit(1);
  }
}

updateImages();
