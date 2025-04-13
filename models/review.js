const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    comment: {
        type: String,
        required: [true, 'Comment is required']
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review",
        },
    ],
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    reply: {
        text: String,
        repliedAt: {
            type: Date,
            default: Date.now
        }
    },
    replyBy: {
        type: String,
    }
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;