const express = require("express");
const userController = require("../controllers/userController");
const userMiddleware = require("../middleware/userMiddleware");
const passport = require("../config/passport");

const router = express.Router();

// Google Sign-In routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), userController.googleCallback);

// Public routes
router.get("/", userController.renderUserHome);
router.get("/login", userController.renderLogin);
router.post("/login", userMiddleware.checkUserBlockedStatus, userController.loginPost);
router.get("/signup", userController.renderSignup);
router.post("/signup", userController.handleSignup);
router.get("/verifyOTP", userController.renderOTP);
router.post("/verifyOTP", userController.verifyOTP);
router.post("/logout", userController.logout);
router.get("/logout", userController.renderLogout);
router.get("/search", userController.searchProperty);
router.get("/applyFilters", userController.applyFilters);
router.get('/home', userController.renderUserHome);
router.get("/propertyDetails", userController.renderPropertyDetails);

// Protected routes (middleware applied)
router.use(userMiddleware.ensureAuthenticated, userMiddleware.checkUserBlockedStatus);

router.get('/payment', userMiddleware.ensureAuthenticated, userController.displayPaymentPage);
router.post('/payment', userMiddleware.ensureAuthenticated, userController.handlePayment);
router.get("/profile", userMiddleware.ensureAuthenticated, userController.renderAndUpdateProfile);
router.post("/profile", userMiddleware.ensureAuthenticated, userController.updateProfile);
router.post("/bookProperty", userMiddleware.ensureAuthenticated, userController.bookProperty);

module.exports = router;
