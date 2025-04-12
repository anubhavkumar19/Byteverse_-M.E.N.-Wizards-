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
const { isAuthenticated, isAuthorized, isLoggedIn, isReviewAuthor } = require("./middleware.js");

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 20 * 60 * 60 * 1000 }
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

app.get("/logout", (req, res) => {
    req.logout();
    req.flash("success", "Logged out successfully");
    res.redirect("/loginsignup");
});

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

app.post("/login", async (req, res) => {
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

app.post("/collections/:id/doctor/:idD/reviews", async (req, res) => {
    let eachDoctor = await DoctorListing.findById(req.params.idD);
    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    eachDoctor.reviews.push(newReview);
    await newReview.save();
    await eachDoctor.save();
    req.flash("success", "Successfully, New Review Created");
    res.redirect(`/collections/${req.params.id}/doctor/${req.params.idD}`);
});

app.delete("/collections/:id/doctor/:idD/reviews/:idR", isLoggedIn, isReviewAuthor, async (req, res) => {
    let {id, idD, idR} = req.params;
    await DoctorListing.findByIdAndUpdate(idD, {$pull: {reviews: idR}});
    await Review.findByIdAndDelete(idR);
    req.flash("success", "Your Review Deleted Successfully!");
    res.redirect(`/collections/${id}/doctor/${idD}`);
});

app.listen(port, () => {
    console.log("app is listening to port 8080");
})