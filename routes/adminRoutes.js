// adminRoutes.js
const express = require("express");
const adminController = require("../controllers/adminController");
const adminMiddleware = require('../middleware/adminMiddleware'); // Import the adminMiddleware
const { ensureAdminAuthenticated } = require('../middleware/adminMiddleware')
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

// Protect the following routes with isAdmin middleware
router.use(adminMiddleware.isAdmin); // This will apply isAdmin middleware to all routes below

router.get("/dashboard", adminMiddleware.ensureAdminAuthenticated, adminController.renderDashboard);
router.post("/categories", adminController.addCategory);
router.get("/requests", adminController.displayPendingRequests);
router.post("/requests/:id/approve", adminController.approveRequest);
router.post("/requests/:id/reject", adminController.rejectRequest);
router.get("/deletion", adminController.renderDeletion);
router.post('/categories/:id/delete', adminController.deleteCategory);
router.post("/users/:id/block", adminController.blockUser); // Route to block a user
router.post("/users/:id/unblock", adminController.unblockUser); // Route to unblock a user
router.post("/owners/:id/block", adminController.blockOwner); // Route to block an owner
router.post("/owners/:id/unblock", adminController.unblockOwner);
router.get('/categories/:categoryId/edit', adminController.getEditCategoryPage);
router.post('/categories/:categoryId/update', adminController.updateCategory);

router.post("/logout", adminController.logout);

module.exports = router;
