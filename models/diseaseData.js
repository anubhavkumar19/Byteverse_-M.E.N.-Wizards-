const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const diseaseDataSchema = new Schema({
    suffix: {
        type: String,
        required: true,
    },
    disease_name: {
        type: String,
        required: true,
    },
    overview: {
        type: String,
        required: true,
    },
    warning_signs: {
        type: String,
        required: true,
    },
    risk_factors: {
        type: String,
        required: true,
    },
    complications: {
        type: String,
        required: true,
    },
    diagnostic_tests: {
        type: String,
        required: true,
    },
    treatment_options: {
        type: String,
        required: true,
    },
    medications: {
        type: String,
        required: true,
    },
    home_remedies: {
        type: String,
        required: true,
    },
    when_to_see_doctor: {
        type: String,
        required: true,
    },
    preventive_measures: {
        type: String,
        required: true,
    },
    prognosis: {
        type: String,
        required: true,
    },
})

const DiseaseData = mongoose.model("DiseaseData", diseaseDataSchema);

module.exports = DiseaseData;