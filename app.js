const express = require("express");
const session = require("express-session");
const flash = require("express-flash");
const path = require("path");
const { body, validationResult } = require('express-validator');
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const passport = require("./config/passport");
const db = require("./config/database");
const noCache = require("nocache"); // Import no-cache middleware
const userMiddleware = require("./middleware/userMiddleware");

const app = express();

// MongoDB connection
db.once("open", () => {
  console.log("Connected to MongoDB!");
});
db.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

// Middleware setup
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use("/scripts", express.static(path.join(__dirname, "scripts")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware setup
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: true,
});
app.use(sessionMiddleware);

// Flash middleware setup
app.use(flash());
// Owner routes setup with session middleware
app.use("/owner", (req, res, next) => {
  sessionMiddleware(req, res, () => {
    // Prevent back button access after login
    if (req.url === "/login" && req.session.owner) {
      return res.redirect("/owner/dashboard");
    }
    next();
  });
}, ownerRoutes);

// Passport middleware setup
app.use(passport.initialize());
app.use(passport.session());

// No-cache middleware setup
app.use(noCache());

// Routes setup
app.use("/", userMiddleware.checkUserBlockedStatus,userRoutes);
app.use("/admin", adminRoutes);
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
