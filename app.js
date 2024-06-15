// Import required modules
const express = require("express");
const session = require("express-session");
const flash = require("express-flash");
const path = require("path");
const { body, validationResult } = require("express-validator");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const passport = require("./config/passport");
const db = require("./config/database");
const noCache = require("nocache");



// Create an Express application
const app = express();



// Set up MongoDB connection
db.once("open", () => {
  console.log("Connected to MongoDB!");
});
db.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

// Set view engine and static file directory
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use("/scripts", express.static(path.join(__dirname, "scripts")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Set up flash middleware
app.use(flash());

// Set up Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Set up no-cache middleware
app.use(noCache());

// Set up routes with middleware
app.use("/", userRoutes);
app.use("/admin", adminRoutes); // Use ensureAdminAuthenticated middleware here
app.use("/owner", ownerRoutes);

// Remove Permissions-Policy header middleware
app.use((req, res, next) => {
  res.removeHeader("Permissions-Policy");
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
