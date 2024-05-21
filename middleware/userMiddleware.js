const UserAdmin = require("../models/userAdmin");

const checkUserBlockedStatus = async (req, res, next) => {
  try {
    // Check if user session exists
    if (!req.session.user) {
      // If session does not exist, proceed to the next middleware or route handler
      return next();
    }

    // Get user ID from session
    const userId = req.session.user._id;

    // Find user by ID
    const user = await UserAdmin.findById(userId);

    // Check if user is blocked
    if (user && user.isBlocked) {
      // If user is blocked, destroy the session and redirect to login page
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
        req.flash("error", "You are blocked. Please contact support.");
        res.redirect("/login");
      });
    } else {
      // If user is not blocked, proceed to the next middleware or route handler
      next();
    }
  } catch (error) {
    console.error("Error checking user blocked status:", error);
    req.flash("error", "Internal Server Error");
    res.redirect("/login");
  }
};

module.exports = { checkUserBlockedStatus };
