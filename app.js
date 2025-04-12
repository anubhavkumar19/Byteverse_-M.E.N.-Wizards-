if(process.env.NODE_ENV != "production"){
    require("dotenv").config();
}

const express = require("express");
const mongoose = require("mongoose");
const DoctorListing = require("./models/doctorListing.js");
const path = require("path");

const app = express();


const dbUrl = process.env.ATLASDB_URL;

async function main() {
    await mongoose.connect(dbUrl);
}

main()
    .then(() => {
        console.log("Connected to DB");
    }).catch((err) => {
        console.log(err);
    });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));







let port = 8080;

//index route
app.get("/", async (req, res) => {
    const allDoctorListings = await DoctorListing.find({});
    res.render("./listings/index.ejs", {allDoctorListings});
})

// show route
app.get("/patient/:id", (req, res) => {
    let {id} = req.params;
    let listing = DoctorListing.findById(id);
    res.render("/listings/show.ejs", {listing});
})

app.listen(port, () => {
    console.log("app is listening to port 8080");
})