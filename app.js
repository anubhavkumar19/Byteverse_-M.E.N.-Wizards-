if(process.env.NODE_ENV != "production"){
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




app.get("/loginForm", (req, res) => {
    res.render("./auth/login.ejs"); // Make sure this file exists
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

        // Add validation
        if (!username || !email || !password) {
            console.log("Validation failed - missing fields");
            return res.status(400).send("All fields are required");
        }

        console.log("Attempting to hash password...");
        const hashedPassword = await bcrypt.hash(password, saltingRound);
        console.log("Password hashed successfully");

        console.log("Creating user object...");
        let newUser = new User({
            username,
            email,
            password: hashedPassword,
        });

        console.log("Attempting to save user...");
        await newUser.save();
        console.log("User saved successfully:", newUser);

        console.log("Redirecting to login...");
        return res.render("/loginForm.ejs");
        
    } catch (error) {
        console.error("FULL ERROR:", error);
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
        req.flash("error", "Email not found"); // Changed from "failure" to "error"
        return res.redirect("/loginsignup");
      }
  
      const isMatching = await bcrypt.compare(password, user.password);
      if (!isMatching) {
        req.flash("error", "Invalid password"); // Changed from "failure" to "error"
        return res.redirect("/loginsignup");
      }
  
      req.flash("success", "Login successful!");
      return res.redirect(`/collections/${user._id}`);
  
    } catch (error) {
      req.flash("error", "Server error"); // Changed from "failure" to "error"
      return res.redirect("/loginsignup");
    }
  });


// allDoctors route
app.get("/collections/:id", async (req, res) => {
    let {id} = req.params;
    let userExists = User.findById(id);
    if(!userExists){
        req.flash("failure", "Please Login to Continue");
        return res.redirect("/loginsignup");
    }

    const allDoctors = await DoctorListing.find({});
    res.render("collections/allDoctors.ejs", {allDoctors});
})

// view page, for each doctor
app.get("/collections/:id",async (req, res) => {
    let {id} = req.params;
    let eachDoctor = await DoctorListing.findById(id);
    res.render("./collections/eachDoctor.ejs", {eachDoctor});
})


app.listen(port, () => {
    console.log("app is listening to port 8080");
})