const mongoose = require("mongoose");
const DoctorListing = require("../models/doctorListing.js");
const sampleDoctorListings = require("./doctorData.js");


const MONGO_URL = process.env.ATLASDB_URL;

async function main() {
  try {
    await mongoose.connect(MONGO_URL, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Connected to DB");
    
    await initDB();
    
    // Give MongoDB time to complete operations before closing
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from DB");
    process.exit(0); // Explicit exit
  }
}

const initDB = async () => {
  try {
    await DoctorListing.deleteMany({});
    
    const doctorListingsWithOwner = sampleDoctorListings.map(obj => ({
      ...obj,
      owner: "67a850df0fe3c3c4ed3b07a5"
    }));
    
    await DoctorListing.insertMany(doctorListingsWithOwner);
    console.log("Data initialized successfully");
  } catch (err) {
    console.error("Initialization failed:", err.message);
    throw err; // Re-throw to stop execution
  }
};

main();