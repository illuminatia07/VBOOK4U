// isAdmin.js

  function isAdmin(req, res, next) {
    if (req.session.isAdmin) {
        // If user is admin, continue to the next middleware or route handler
        next();
    } else {
        // If user is not admin, redirect to login page with an error message
        req.flash('error', 'You are not authorized to access this page');
        res.redirect("/admin/login");
    }
}

module.exports = isAdmin;
