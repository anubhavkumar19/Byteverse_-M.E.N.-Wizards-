if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const mongoose = require("mongoose");
const DoctorListing = require("../models/doctorListing.js");
const sampleDoctorListings = require("./doctorData.js");
const DiseaseData = require("../models/diseaseData.js");
const sampleInfoData = require("./infoData.js");

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



    await DiseaseData.deleteMany({});
    console.log("Cleared existing disease listings");
    
    await DiseaseData.insertMany(sampleInfoData);
    console.log(`Inserted disease listings`);
    

  } catch (err) {
    console.error("Initialization failed:", err);
    throw err;
  }
};

main();