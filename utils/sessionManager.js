// utils/sessionManager.js
const isAuth = (req, res, next) => {
  if (req.session.user) {
    next(); // User is authenticated, proceed to the next middleware
  } else {
    res.redirect("/login"); // Redirect to login page if user is not authenticated
  }
};

const createSession = (req, userData) => {
  req.session.user = {
    _id: userData._id, // Example: Store only essential user data in the session
    email: userData.email,
    isAdmin: userData.isAdmin,
  };
  req.session.save(); // Save the session to the store
};

module.exports = { isAuth, createSession };