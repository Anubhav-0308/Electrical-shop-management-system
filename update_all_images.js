require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

// Make sure these extensions match what you saved the images as!
// If you saved them as .png or .jpg, change the ".webp" below to match.
const categoryImageMap = {
  "switch": "/src/images/cat-switch.png",
  "5-pin-socket": "/src/images/cat-switch.png",
  "3-pin-socket": "/src/images/cat-switch.png",
  "wire": "/src/images/cat-wire.jpeg",
  "mcb": "/src/images/cat-mcb.jpeg",
  "led-bulb": "/src/images/cat-bulb.jpg",
  "tube-light": "/src/images/cat-tube.jpeg",
  "fan": "/src/images/cat-fan.jpeg",
  "extension-board": "/src/images/cat-extension.jpeg"
};

async function updateAllImages() {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shri_krishna_lighthouse";
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    let totalUpdated = 0;

    for (const [category, imagePath] of Object.entries(categoryImageMap)) {
      const result = await Product.updateMany(
        { category: category },
        { $set: { image: imagePath } }
      );
      if (result.modifiedCount > 0) {
        console.log(`Updated ${result.modifiedCount} products in category '${category}' to use ${imagePath}`);
        totalUpdated += result.modifiedCount;
      }
    }

    console.log(`\nSuccess! Updated a total of ${totalUpdated} products.`);
    process.exit(0);
  } catch (err) {
    console.error("Error updating images:", err);
    process.exit(1);
  }
}

updateAllImages();
