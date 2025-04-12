const mongoose = require("mongoose");
const Schema = mongoose.Schema;

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
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review",
        },
    ],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "Doctor",
    },
});

const DoctorListing = mongoose.model("DoctorListing", doctorListingSchema);

module.exports = DoctorListing;