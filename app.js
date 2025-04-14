if (process.env.NODE_ENV != "production") {
    require("dotenv").config();
}


const express = require("express");
const mongoose = require("mongoose");
const DoctorListing = require("./models/doctorListing.js");
const path = require("path");
const User = require("./models/user.js");
const bcrypt = require("bcrypt");
const saltingRound = 10;
const app = express();
const multer = require("multer");
const { storage } = require('./cloudinary.js');
const upload = multer({ storage });

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
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const methodOverride = require("method-override");
app.use(methodOverride("_method"));

const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Review = require("./models/review.js");
const { isAuthenticated, isAuthorized, isLoggedIn, isReviewAuthor, isDoctorLoggedIn } = require("./middleware.js");
const sampleInfoData = require("./init/infoData.js");
const DiseaseData = require("./models/diseaseData.js");

app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const user = await User.findOne({ username });
            if (!user) return done(null, false, { message: 'Incorrect username' });
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) return done(null, false, { message: 'Incorrect password' });
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

app.use((req, res, next) => {
    res.locals.messages = {
        success: req.flash('success'),
        error: req.flash('error'),
        failure: req.flash('failure')
    };
    res.locals.currUser = req.user;
    next();
});

let port = 8080;

app.get("/", async (req, res) => {
    res.render("./collections/getStarted.ejs");
});

// user logout
app.get('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        req.flash('success', 'Logged out successfully');
        res.redirect('/');
    });
});

// doctor logout
app.get("/doctors/logout", (req, res) => {
    req.session.doctorId = null;
    req.flash("success", "Doctor logged out successfully");
    res.redirect("/");
});

// user loginsignup
app.get("/loginsignup", (req, res) => {
    res.render("./auth/loginsignup.ejs");
});

app.post("/signup", async (req, res) => {
    try {
        let { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).send("All fields are required");
        }
        const hashedPassword = await bcrypt.hash(password, saltingRound);
        let newUser = new User({
            username,
            email,
            password: hashedPassword,
        });
        await newUser.save();
        req.flash("success", "User registered successfully! Login to continue.");
        return res.redirect("/loginsignup");
    } catch (error) {
        if (error.name === 'MongoServerError' && error.code === 11000) {
            return res.status(400).send("Email or username already exists");
        }
        return res.status(500).send("Registration failed: " + error.message);
    }
});

app.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            req.flash("error", "Email not found");
            return res.redirect("/loginsignup");
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash("error", "Invalid password");
            return res.redirect("/loginsignup");
        }
        req.login(user, (err) => {
            if (err) {
                req.flash("error", "Login failed");
                return res.redirect("/loginsignup");
            }
            req.flash("success", "Login successful!");
            return res.redirect(`/collections/${user._id}`);
        });
    } catch (error) {
        req.flash("error", "Server error");
        return res.redirect("/loginsignup");
    }
});

// info route
app.get("/info", async (req, res) => {
    const allInfo = await DiseaseData.find({});
    res.render("collections/allInfo.ejs", { allInfo });
})

// doctor signup
app.get("/doctor", (req, res) => {
    res.render("auth/doctorSignup.ejs");
})

app.get("/doctorLogin", (req, res) => {
    res.render("auth/doctorLogin.ejs");
});


// doctor
app.post('/doctorSignup', upload.single('image'), async (req, res) => {
    try {

        const passwordHash = await bcrypt.hash(req.body.password, 12);

        const newDoctor = new DoctorListing({
            ...req.body,
            password: passwordHash,
            image: {
                url: req.file?.path,
                filename: req.file?.filename
            },
        });

        await newDoctor.save();
        req.flash("success", "Profile Submitted Successfully");
        res.render("auth/doctorLogin.ejs");
    } catch (err) {
        req.flash("error", `Some error occurred ${err}`)
        res.redirect("/doctor");
    }
});

// doctor login
app.post('/doctors/login', async (req, res) => {
    const { email, password } = req.body;

    const doctor = await DoctorListing.findOne({ email });
    if (!doctor) {
        req.flash("error", "No doctor found with that email.");
        return res.render("auth/doctorLogin.ejs");
    }

    const match = await bcrypt.compare(password, doctor.password);
    if (!match) {
        req.flash("error", "Incorrect Password");
        return res.render("auth/doctorLogin.ejs");
    }

    req.session.doctorId = doctor._id;
    req.flash("success", "Login successful!");
    res.redirect('/doctors/collections');
});

// doctors collections on sign in
app.get("/doctors/collections", isDoctorLoggedIn, async (req, res) => {
    try {
        const allDoctors = await DoctorListing.find({});
        const currentDoctor = await DoctorListing.findById(req.session.doctorId);
        res.render("doctors/allDoctors.ejs", {
            allDoctors,
            currentDoctor,
        });
    } catch (error) {
        req.flash("error", "Failed to load collections");
        res.redirect("/doctorsLogin");
    }
});

// each page show route for doctors
app.get("/doctors/collections/:id", isDoctorLoggedIn, async (req, res) => {
    let { id } = req.params;

    try {
        let doctor = await DoctorListing.findById(id)
            .populate({
                path: 'reviews',
                populate: {
                    path: 'author',
                    select: 'username'
                }
            });

        if (!doctor) {
            req.flash("error", "No such doctor exists");
            return res.redirect("/doctors/collections");
        }

        const currentDoctor = await DoctorListing.findById(req.session.doctorId);
        res.render("doctors/eachDoctor.ejs", {
            doctor,
            currentDoctor
        });
    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong");
        res.redirect("/doctors/collections");
    }
});




// Search disease information
app.get("/collections/disease/search", async (req, res) => {
    try {
        const { searchQuery } = req.query;

        if (!searchQuery || searchQuery.trim().length < 2) {
            req.flash("error", "Please enter vlaid details");
            return res.redirect("/info");
        }

        let results = await DiseaseData.find({
            $or: [
                { disease_name: { $regex: searchQuery, $options: 'i' } },
                { suffix: { $regex: searchQuery, $options: 'i' } }
            ]
        });

        if (results.length === 0) {
            results = await DiseaseData.find({
                $or: [
                    { overview: { $regex: searchQuery, $options: 'i' } },
                    { warning_signs: { $regex: searchQuery, $options: 'i' } },
                    { risk_factors: { $regex: searchQuery, $options: 'i' } }
                ]
            });
        }

        res.render("collections/searchedDisease.ejs", { 
            allInfo: results, searchQuery
        });

    } catch (error) {
        console.error("Search error:", error);
        req.flash("error", "Failed to search diseases");
        res.redirect("/info");
    }
});


// Search doctors by user
app.get("/collections/doctor/search", async (req, res) => {
    try {
        const { searchQuery } = req.query;

        const results = await DoctorListing.find({
            $or: [
                { doctorName: { $regex: searchQuery, $options: 'i' } },
                { category: { $regex: searchQuery, $options: 'i' } },
                { location: { $regex: searchQuery, $options: 'i' } },
                { address: { $regex: searchQuery, $options: 'i' } },
                { country: { $regex: searchQuery, $options: 'i' } }
            ]
        }).populate('reviews');

        res.render("collections/searchedQuery.ejs", { allDoctors: results, currentUser: req.user, });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// reply from doctor    newly added
app.post('/doctors/collections/:doctorId/reviews/:reviewId/reply', isDoctorLoggedIn, async (req, res) => {
    try {
        const { doctorId, reviewId } = req.params;
        const { replyText } = req.body;
        const review = await Review.findById(reviewId);
        if (!review) {
            req.flash("error", "Review not found");
            return res.redirect(`/doctors/collections/${doctorId}`);
        }

        review.reply = {
            text: replyText,
            repliedAt: new Date()
        };
        const currentDoctor = await DoctorListing.findById(req.session.doctorId);
        review.replyBy = currentDoctor.doctorName;
        await review.save();
        req.flash("success", "Reply posted!");
        res.redirect(`/doctors/collections/${doctorId}`);
    } catch (e) {
        req.flash("error", "Failed to post reply");
        res.redirect(`/doctors/collections/${req.params.doctorId}`);
    }
});



// main page for user
app.get("/collections/:id", isAuthenticated, isAuthorized, async (req, res) => {
    try {
        const allDoctors = await DoctorListing.find({});
        res.render("collections/allDoctors.ejs", {
            allDoctors,
            currentUser: req.user,
        });
    } catch (error) {
        req.flash("error", "Server error");
        res.redirect("/loginsignup");
    }
});

// show info route or eachInfo 
app.get("/collections/disease/:idDisease", async (req, res) => {
    let { idDisease } = req.params;

    const eachDisease = await DiseaseData.findById(idDisease);

    res.render("collections/eachInfo.ejs", { eachDisease });

})


app.get("/collections/:id/doctor/:idD", isAuthenticated, isAuthorized, async (req, res) => {
    let { idD, id } = req.params;
    let doctor = await DoctorListing.findById(idD)
        .populate({
            path: 'reviews',
            populate: {
                path: 'author',
                select: 'username'
            }
        });
    if (doctor) {
        res.render("./collections/eachDoctor.ejs", { doctor, currentUser: req.user });
    } else {
        req.flash("error", "No such doctor exits");
        res.redirect(`/collections/${id}`);
    }
});

// app.post("/collections/:id/doctor/:idD/reviews",isLoggedIn, async (req, res) => {
//     let eachDoctor = await DoctorListing.findById(req.params.idD);
//     let newReview = new Review(req.body.review);
//     newReview.author = req.user._id;
//     eachDoctor.reviews.push(newReview);
//     await newReview.save();
//     await eachDoctor.save();
//     req.flash("success", "Successfully, New Review Created");
//     res.redirect(`/collections/${req.params.id}/doctor/${req.params.idD}`);
// });

app.post("/collections/:id/doctor/:idD/reviews", isLoggedIn, async (req, res) => {
    try {
        const { id, idD } = req.params;
        const { rating, comment } = req.body.review || {};
        
        // Validate input
        if (!rating || !comment) {
            req.flash("error", "Both rating and comment are required");
            return res.redirect(`/collections/${id}/doctor/${idD}`);
        }

        // Check if rating is a valid number
        const numericRating = Number(rating);
        if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
            req.flash("error", "Rating must be between 1 and 5");
            return res.redirect(`/collections/${id}/doctor/${idD}`);
        }

        const doctor = await DoctorListing.findById(idD);
        if (!doctor) {
            req.flash("error", "Doctor not found");
            return res.redirect(`/collections/${id}`);
        }

        const newReview = new Review({
            rating: numericRating,
            comment,
            author: req.user._id
        });

        doctor.reviews.push(newReview);
        
        await Promise.all([newReview.save(), doctor.save()]);
        
        req.flash("success", "Review submitted successfully");
        return res.redirect(`/collections/${id}/doctor/${idD}`);
    } catch (error) {
        console.error("Review submission error:", error);
        req.flash("error", "Failed to submit review");
        return res.redirect(`/collections/${req.params.id}/doctor/${req.params.idD}`);
    }
});

app.delete("/collections/:id/doctor/:idD/reviews/:idR", isLoggedIn, isReviewAuthor, async (req, res) => {
    let { id, idD, idR } = req.params;
    await DoctorListing.findByIdAndUpdate(idD, { $pull: { reviews: idR } });
    await Review.findByIdAndDelete(idR);
    req.flash("success", "Your Review Deleted Successfully!");
    res.redirect(`/collections/${id}/doctor/${idD}`);
});



app.listen(port, () => {
    console.log("app is listening to port 8080");
});