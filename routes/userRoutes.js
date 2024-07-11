const express = require("express");
const userController = require("../controllers/userController");
const userMiddleware = require("../middleware/userMiddleware");
const passport = require("../config/passport");
const { Booking } = require("../models/booking"); // Assuming you have a Booking model
const router = express.Router();

// Google Sign-In routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), userController.googleCallback);

// Public routes
router.get("/", userController.renderUserHome);
router.get("/login", userController.renderLogin);
router.post("/login", userController.loginPost);
router.get("/signup", userController.renderSignup);
router.post("/signup", userController.handleSignup);
router.get("/verifyOTP", userController.renderOTP);
router.post("/verifyOTP", userController.verifyOTP);
router.post("/logout", userController.logout);
router.get("/logout", userController.renderLogout);
router.get("/search", userController.searchProperty);
router.get("/applyFilters",userController.applyFilters);
router.get('/home', userController.renderUserHome);

// Protected routes
router.get('/payment', userMiddleware.ensureAuthenticated, userController.displayPaymentPage);
router.get("/profile", userMiddleware.ensureAuthenticated, userController.renderAndUpdateProfile);
router.get("/propertyDetails", userMiddleware.ensureAuthenticated, userController.renderPropertyDetails);
router.post("/profile", userMiddleware.ensureAuthenticated, userController.updateProfile);
router.post('/storePaymentDetails', userMiddleware.ensureAuthenticated,  userController.storePaymentDetails);
router.get("/change-password", userMiddleware.ensureAuthenticated, userController.renderChangePassword);
router.post("/change-password", userMiddleware.ensureAuthenticated, userController.changePassword);
router.get("/yourBooking", userMiddleware.ensureAuthenticated, userController.renderYourBooking);
router.get("/viewDetails", userMiddleware.ensureAuthenticated, userController.viewDetails);
router.post("/cancelBooking", userMiddleware.ensureAuthenticated, userController.cancelBooking);
router.post('/applyCoupon', userMiddleware.ensureAuthenticated, userController.applyCoupon);
router.post('/verifyPayment', userMiddleware.ensureAuthenticated, userController.verifyPayment);
router.post('/handlePayment', userMiddleware.ensureAuthenticated, userController.handlePayment);
router.get('/paymentSuccess',userMiddleware.ensureAuthenticated, userController.renderPaymentSuccessPage);
router.get('/paymentSuccessPAP',userMiddleware.ensureAuthenticated, userController.renderPaymentSuccessPAP);
router.post('/createOrder',userMiddleware.ensureAuthenticated, userController.createOrder);
router.post('/verifyRetryPayment', userMiddleware.ensureAuthenticated, userController.verifyRetryPayment);




module.exports = router;
