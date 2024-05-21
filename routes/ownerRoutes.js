// ownerRoutes.js
const express = require("express");
const ownerController = require("../controllers/ownerController");
const { checkBlockedStatus } = require("../middleware/ownerMiddleware");
const noCache = require("nocache");
const router = express.Router();

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
router.get("/dashboard", ownerController.renderDashboard); // Dashboard route
router.post("/dashboard/addProperty", ownerController.addProperty); // Form submission route for adding property
router.post(
  "/dashboard/updateAvailability/:propertyId",
  ownerController.updateAvailability
);
router.post(
  "/dashboard/deleteProperty/:propertyId",
  ownerController.deleteProperty
);
router.post(
  "/dashboard/editProperty/:propertyId",
  ownerController.editProperty
);
router.get("/logout", ownerController.logout);

module.exports = router;
