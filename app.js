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

const session = require('express-session');
const flash = require('connect-flash');
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}));
app.use(flash());
app.use((req, res, next) => {
    res.locals.messages = {
        success: req.flash('success'),
        error: req.flash('error'),
        failure: req.flash('failure')
    };
    next();
});


// for authetication and authorization
const passport = require('passport');
const { isAuthenticated, isAuthorized } = require("./middleware.js");
const LocalStrategy = require('passport-local').Strategy;
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));
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


let port = 8080;

//home route
app.get("/", async (req, res) => {
    res.render("./collections/getStarted.ejs");
})

// register route
app.get("/loginsignup", (req, res) => {
    res.render("./auth/loginsignup.ejs");
})

// app.get("/loginForm", (req, res) => {
//     res.render("./auth/login.ejs");
// });

// Modified registration route
app.post("/signup", async (req, res) => {
    try {
        console.log("Registration attempt with:", req.body);

        let { username, email, password } = req.body;

        if (!username || !email || !password) {
            console.log("Validation failed - missing fields");
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

        return res.render("/loginForm.ejs");

    } catch (error) {
        if (error.name === 'MongoServerError' && error.code === 11000) {
            return res.status(400).send("Email or username already exists");
        }
        return res.status(500).send("Registration failed: " + error.message);
    }
});

// login route
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            req.flash("error", "Email not found");
            return res.redirect("/loginsignup");
        }

        const isMatc = await bcrypt.compare(password, user.password);
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

app.get("/logout", (req, res) => {
    req.logout();
    req.flash("success", "Logged out successfully");
    res.redirect("/loginsignup");
})


// allDoctors route
app.get("/collections/:id", isAuthenticated, isAuthorized, async (req, res) => {

    try {
        const allDoctors = await DoctorListing.find({});
        res.render("collections/allDoctors.ejs", {
            allDoctors,
            currentUser: req.user
        });
    } catch (error) {
        req.flash("error", "Server error");
        res.redirect("/loginsignup");
    }
})

// view page, for each doctor
app.get("/collections/:id", async (req, res) => {
    let { id } = req.params;
    let eachDoctor = await DoctorListing.findById(id);
    res.render("./collections/eachDoctor.ejs", { eachDoctor });
})


app.listen(port, () => {
    console.log("app is listening to port 8080");
})