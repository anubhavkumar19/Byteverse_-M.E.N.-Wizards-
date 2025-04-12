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
    console.log(`Connected to DB: ${mongoose.connection.name}`);
    
    await initDB();
  } catch (err) {
    console.error("Error:", err);
  } finally {
    // Wait a bit longer before disconnecting
    setTimeout(async () => {
      await mongoose.disconnect();
      console.log("Disconnected from DB");
    }, 2000);
  }
}

const initDB = async () => {
  try {
    await DoctorListing.deleteMany({});
    console.log("Cleared existing doctor listings");
    
    const doctorListingsWithOwner = sampleDoctorListings.map(obj => ({
      ...obj,
      owner: "67efd718c5376f036e5ece63"
    }));
    
    const result = await DoctorListing.insertMany(doctorListingsWithOwner);
    console.log(`Inserted ${result.length} doctor listings`);
  } catch (err) {
    console.error("Initialization failed:", err);
    throw err;
  }
};

main();