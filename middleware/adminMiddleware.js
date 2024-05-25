const UserAdmin = require("../models/userAdmin"); // Ensure this is the correct model

const adminMiddleware = {
    isAdmin: async (req, res, next) => {
        try {
            if (!req.session.isAdmin) {
                req.flash('error', 'You are not authorized to access this page');
                return res.redirect("/admin/login");
            }

            const { email } = req.session.admin;
            const user = await UserAdmin.findOne({ email });

            if (user && user.isAdmin) {
                // If user is admin, continue to the next middleware or route handler
                return next();
            } else {
                // If user is not admin, redirect to login page with an error message
                req.flash('error', 'You are not authorized to access this page');
                return res.redirect("/admin/login");
            }
        } catch (error) {
            console.error("Error in isAdmin middleware:", error);
            req.flash('error', 'Internal Server Error');
            return res.redirect("/admin/login");
        }
    },
     ensureAdminAuthenticated : (req, res, next) => {
        if ( req.session.isAdmin) {
          return next();
        } else {
          req.flash("error", "You must be logged in as an admin to view this page.");
          return res.redirect("/admin/login");
        }
      }
};

module.exports = adminMiddleware;
