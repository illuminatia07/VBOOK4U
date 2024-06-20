// ownerRoutes.js
const express = require("express");
const ownerController = require("../controllers/ownerController");
const { checkBlockedStatus } = require("../middleware/ownerMiddleware");
const noCache = require("nocache");
const Property = require("../models/property");
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, '../public/uploads/properties') });
const router = express.Router();
const {
  uploadProfilePicture,
  uploadPropertyImage,
} = require("../middleware/multer");

router.use(noCache());
router.use((req, res, next) => {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  next();
});

// Ensure checkBlockedStatus is defined before it's used
router.use(checkBlockedStatus);

router.get("/login", ownerController.renderLogin);
router.post("/login", ownerController.loginPost);
router.get("/", ownerController.renderLogin);
router.post("/", ownerController.loginPost);
router.get("/signup", ownerController.renderSignup);
router.post("/signup", ownerController.handleSignup);
router.get("/dashboard/properties", ownerController.fetchProperties);
router.get("/dashboard", ownerController.renderDashboard);

// Ensure this route is correctly defined and not duplicated
router.post(
  "/updateProfile",
  uploadProfilePicture.single("profilePicture"),
  ownerController.updateProfile
);

router.post("/changePassword", ownerController.changePassword);
router.post("/cancelBooking/:bookingId", ownerController.cancelBooking);
router.get("/dashboard/editProperty/:id", ownerController.renderEditProperty);
router.post("/dashboard/editProperty/:id", upload.array('images', 3), ownerController.editProperty);
router.get("/editProfile", ownerController.renderEditProfilePage);

router.post(
  "/dashboard/updateAvailability/:propertyId",
  ownerController.updateAvailability
);
router.post(
  "/dashboard/deleteProperty/:propertyId",
  ownerController.deleteProperty 
);

router.post(
  "/dashboard/addProperty",
  uploadPropertyImage.array("images", 3),
  (req, res, next) => {
      console.log("Request Files:", req.files);
      next();
  },
  ownerController.addProperty
);
router.get("/changePassword", ownerController.renderChangePasswordPage);
router.get("/logout", ownerController.logout);

module.exports = router;
