const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const doctorListingSchema = new Schema({
    doctorName: {
        type: String,
        required: true,
    },
    image: {
        url: String,
        filename: String,
    },
    fee: Number,
    location: String,
    country: String,
    category: {
        type: String,
        required: true,
        enum: ["Cardiology", "Neurology", "Pulmonology", "Gastroenterology", "Nephrology", "Hematology", "Endocrinology", "Orthopedics", "Dermatology", "Ophthalmology"], // Add all categories here
    },
    experience: String,
    rating: Number,
    availability: String,
    time: String,
    contact: Number,
    email: String,
    address: String,
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review",
        },
    ],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
});

const DoctorListing = mongoose.model("DoctorListing", doctorListingSchema);

module.exports = DoctorListing;