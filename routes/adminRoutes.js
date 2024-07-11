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
router.post('/admin/sales-report',adminMiddleware.ensureAdminAuthenticated, adminController.renderDashboard);
router.post("/categories", adminMiddleware.ensureAdminAuthenticated, adminController.addCategory);
router.get('/requests', adminMiddleware.ensureAdminAuthenticated, adminController.displayPendingRequests);
router.post('/requests/:id/approve',adminMiddleware.ensureAdminAuthenticated, adminController.approveRequest);
router.post('/requests/:id/reject',adminMiddleware.ensureAdminAuthenticated, adminController.rejectRequest);
router.get("/deletion",adminMiddleware.ensureAdminAuthenticated, adminController.renderDeletion);
router.post('/categories/:id/delete',adminMiddleware.ensureAdminAuthenticated, adminController.deleteCategory);
router.post("/users/:id/block",adminMiddleware.ensureAdminAuthenticated, adminController.blockUser); // Route to block a user
router.post("/users/:id/unblock",adminMiddleware.ensureAdminAuthenticated, adminController.unblockUser); // Route to unblock a user
router.post("/owners/:id/block",adminMiddleware.ensureAdminAuthenticated, adminController.blockOwner); // Route to block an owner
router.post("/owners/:id/unblock",adminMiddleware.ensureAdminAuthenticated, adminController.unblockOwner);
router.get('/categories/:categoryId/edit',adminMiddleware.ensureAdminAuthenticated, adminController.getEditCategoryPage);
router.post('/categories/:categoryId/update',adminMiddleware.ensureAdminAuthenticated, adminController.updateCategory);
router.post("/bookings/:id/cancel",adminMiddleware.ensureAdminAuthenticated, adminController.cancelBooking);
router.post("/coupons/create",adminMiddleware.ensureAdminAuthenticated, adminController.createCoupon);
router.post("/coupons/update/:id",adminMiddleware.ensureAdminAuthenticated, adminController.updateCoupon);
router.post('/coupons/delete/:id',adminMiddleware.ensureAdminAuthenticated, adminController.deleteCoupon);
router.get('/revenue/daily', adminMiddleware.ensureAdminAuthenticated, adminController.getDailyRevenue);
router.get('/revenue/monthly', adminMiddleware.ensureAdminAuthenticated, adminController.getMonthlyRevenue);
router.get('/revenue/yearly', adminMiddleware.ensureAdminAuthenticated, adminController.getYearlyRevenue);

router.post("/logout", adminController.logout);

module.exports = router;
