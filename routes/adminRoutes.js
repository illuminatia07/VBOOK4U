// adminRoutes.js
const express = require("express");
const adminController = require("../controllers/adminController");
const isAdmin = require('../utils/isAdmin');
const noCache = require("nocache");
const router = express.Router();

router.use(noCache());
// Middleware to prevent caching
router.use((req, res, next) => {
    res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.header("Expires", "-1");
    res.header("Pragma", "no-cache");
    next();
  });

router.get("/login", adminController.renderLogin);
router.get("/", adminController.renderLogin);
router.post("/login", adminController.loginPost);
router.get("/dashboard", isAdmin, adminController.renderDashboard);
router.post("/categories", isAdmin, adminController.addCategory);
router.get("/requests", isAdmin, adminController.displayPendingRequests);
router.post("/requests/:id/approve", isAdmin, adminController.approveRequest);
router.post("/requests/:id/reject", isAdmin, adminController.rejectRequest);
router.get("/deletion",isAdmin, adminController.renderDeletion);
router.post('/categories/:id/delete',isAdmin, adminController.deleteCategory);
router.post("/users/:id/block", isAdmin, adminController.blockUser); // Route to block a user
router.post("/users/:id/unblock", isAdmin, adminController.unblockUser); // Route to unblock a user
router.post("/owners/:id/block", isAdmin, adminController.blockOwner); // Route to block an owner
router.post("/owners/:id/unblock", isAdmin, adminController.unblockOwner); // Route to unblock an owner

router.post("/logout", adminController.logout);


module.exports = router;
