const UserAdmin = require('../models/userAdmin'); // Ensure this path is correct

const userMiddleware = {
  checkUserBlockedStatus: async (req, res, next) => {
    try {
      if (req.session && req.session.user) {
        const user = await UserAdmin.findById(req.session.user._id);
        if (user && user.isBlocked) {
          req.flash("error", "Your account has been blocked. Please contact support.");
          return res.redirect("/login");
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  },
  ensureAuthenticated: (req, res, next) => {
    if (req.session && req.session.user) {
      return next();
    } else {
      req.flash("error", "You must be logged in to view this page.");
      return res.redirect("/login");
    }
  }
};

module.exports = userMiddleware;
