const Owner = require("../models/owner");

const checkBlockedStatus = async (req, res, next) => {
  try {
    // Check if owner session exists
    if (!req.session.owner) {
      // If session does not exist, proceed to the next middleware or route handler
      return next();
    }

    // Get owner ID from session
    const ownerId = req.session.owner._id;

    // Find owner by ID
    const owner = await Owner.findById(ownerId);

    // Check if owner is blocked
    if (owner && owner.isBlocked) {
      // If owner is blocked, destroy the session and redirect to login page
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
        req.flash("error", "You are blocked. Please contact support.");
        res.redirect("/owner/login");
      });
    } else {
      // If owner is not blocked, proceed to the next middleware or route handler
      next();
    }
  } catch (error) {
    console.error("Error checking blocked status:", error);
    req.flash("error", "Internal Server Error");
    res.redirect("/owner/login");
  }
};

module.exports = { checkBlockedStatus };
