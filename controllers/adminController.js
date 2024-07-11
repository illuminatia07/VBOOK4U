// adminController.js
const bcrypt = require("bcrypt");
const User = require("../models/userAdmin");
const Category = require("../models/category"); // Import the Category model
const Property = require("../models/property"); // Import the Property model
const Owner = require("../models/owner");
const Booking = require("../models/booking"); // Import the Booking model
const Coupon = require("../models/coupon");
const moment = require("moment"); // Ensure moment is installed: npm install moment

const adminController = {
  renderLogin: (req, res) => {
    if (req.session.isAdmin) {
      // If an admin session exists, redirect to the admin dashboard
      return res.redirect("/admin/dashboard");
    } else {
      // If no admin session exists, render the admin login page
      return res.render("admin/adminLogin", {
        errorMessage: req.flash("error"),
        successMessage: req.flash("success"),
      });
    }
  },

  displayPendingRequests: async (req, res) => {
    try {
      const pendingRequests = await Property.find({
        approvalStatus: "Pending",
      }).populate("owner");
      const admin = await User.findOne({ email: req.session.admin.email });

      if (!admin) {
        req.flash("error", "Admin not found");
        return res.redirect("/admin/login");
      }

      const flashMessages = {
        error: req.flash("error"),
      };

      res.render("admin/adminDashboard", {
        admin,
        requests: pendingRequests,
        messages: flashMessages,
      });
    } catch (error) {
      console.error("Error displaying pending requests:", error);
      req.flash("error", "Failed to fetch pending requests.");
      return res.redirect("/admin/dashboard");
    }
  },

  rejectRequest: async (req, res) => {
    try {
      const requestId = req.params.id;

      // Find the property by ID and delete it
      await Property.findByIdAndDelete(requestId);

      req.flash("success", "Property rejected and deleted successfully.");
      return res.redirect("/admin/dashboard");
    } catch (error) {
      console.error("Error rejecting request:", error);
      req.flash("error", "Failed to reject property.");
      return res.redirect("/admin/dashboard");
    }
  },

  approveRequest: async (req, res) => {
    try {
      const requestId = req.params.id;

      // Find the property by ID and update its approval status to "Approved"
      await Property.findByIdAndUpdate(requestId, {
        approvalStatus: "Approved",
      });

      req.flash("success", "Property approved successfully.");
      return res.redirect("/admin/dashboard");
    } catch (error) {
      console.error("Error approving request:", error);
      req.flash("error", "Failed to approve property.");
      return res.redirect("/admin/dashboard");
    }
  },

  loginPost: async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        req.flash("error", "Invalid email or password");
        return res.redirect("/admin/login");
      }
      if (user.isAdmin && bcrypt.compareSync(password, user.password)) {
        // Set session variables upon successful login
        req.session.isAdmin = true;
        req.session.admin = {
          _id: user._id,
          email: email,
        };
        return res.redirect("/admin/dashboard");
      } else {
        req.flash("error", "Invalid email or password");
        return res.redirect("/admin/login");
      }
    } catch (error) {
      console.error("Error logging in:", error);
      req.flash("error", "Internal Server Error");
      return res.redirect("/admin/login");
    }
  },
  renderDashboard: async (req, res) => {
    try {
      if (!req.session.isAdmin) {
        req.flash("error", "You are not authorized to access this page");
        return res.redirect("/admin/login");
      }

      const owners = await Owner.find();
      const coupon = await Coupon.find().populate("category");
      const { email } = req.session.admin;
      const admin = await User.findOne({ email });
      const pendingRequests = await Property.find({
        approvalStatus: "Pending",
      }).populate("owner");

      if (!admin) {
        req.flash("error", "Admin not found");
        return res.redirect("/admin/login");
      }

      const categories = await Category.find();
      const properties = await Property.find().populate("owner");
      const users = await User.find();
      const bookings = await Booking.find()
        .populate("property")
        .populate("user");

      // Calculate the total number of properties, users, and owners
      const totalProperties = properties.length;
      const totalUsers = users.length;
      const totalOwners = owners.length;
      const totalBookings = bookings.length;

      // Calculate total sales
      const totalSales = bookings.reduce(
        (acc, booking) => acc + booking.price,
        0
      );

      // Calculate total transactions
      const totalTransactions = bookings.length;

      // Calculate total revenue by month
      const monthlyRevenue = {};
      const totalBookingsPerMonth = {};
      const monthlyBookingsByPayMethod = {};
      const totalBookingsByPayMethod = {
        Online: 0,
        PayAtProperty: 0,
      };

      const coupons = await Coupon.find();
      bookings.forEach((booking) => {
        const monthYear = moment(booking.dateInitiated).format("YYYY-MM");
        if (!monthlyRevenue[monthYear]) {
          monthlyRevenue[monthYear] = 0;
          totalBookingsPerMonth[monthYear] = 0;
          monthlyBookingsByPayMethod[monthYear] = {
            Online: 0,
            PayAtProperty: 0,
          };
        }
        monthlyRevenue[monthYear] += booking.price;
        totalBookingsPerMonth[monthYear]++;
        monthlyBookingsByPayMethod[monthYear][booking.payMethod]++;
        totalBookingsByPayMethod[booking.payMethod]++;
      });

      const distinctMonths = Object.keys(monthlyRevenue);
      const selectedMonth = req.query.month || distinctMonths[0];

      const topProperties = await Property.aggregate([
        {
          $lookup: {
            from: "bookings",
            localField: "_id",
            foreignField: "property",
            as: "bookings",
          },
        },
        {
          $addFields: {
            totalBookings: { $size: "$bookings" },
          },
        },
        {
          $sort: { totalBookings: -1 },
        },
        {
          $limit: 5,
        },
      ]);

      const totalRevenueByPayMethod = {
        Online: 0,
        PayAtProperty: 0,
      };

      bookings.forEach((booking) => {
        totalRevenueByPayMethod[booking.payMethod] += booking.price;
      });

      const flashMessages = {
        error: req.flash("error"),
        success: req.flash("success"),
        addCategoryError: req.flash("error"),
        addCategorySuccess: req.flash("success"),
        categoryDeletedSuccess: req.flash("success"),
      };

      res.render("admin/adminDashboard", {
        admin,
        owners,
        totalBookings,
        bookings, // Pass bookings to the view
        categories,
        properties,
        coupon: coupon,
        users,
        coupons: coupons,
        totalProperties,
        moment: moment,
        totalUsers,
        totalOwners,
        totalRevenueByPayMethod,
        monthlyRevenue,
        totalBookingsPerMonth,
        monthlyBookingsByPayMethod,
        totalBookingsByPayMethod,
        distinctMonths,
        selectedMonth,
        topProperties,
        totalSales, // Pass totalSales to the view
        totalTransactions, // Pass totalTransactions to the view
        messages: flashMessages,
        requests: pendingRequests,
      });
    } catch (error) {
      console.error("Error rendering dashboard:", error);
      req.flash("error", "Internal Server Error");
      return res.redirect("/admin/login");
    }
  },

  renderDeletion: async (req, res) => {
    try {
      const properties = await Property.find().populate("owner");

      const flashMessages = {
        error: req.flash("error"),
        addCategoryError: req.flash("error"),
        categoryDeletedSuccess: req.flash("success"),
      };

      res.render("admin/adminDashboard", {
        admin: req.session.user,
        properties: properties,
        messages: flashMessages,
      });
    } catch (error) {
      console.error("Error rendering deletion:", error);
      req.flash("error", "Internal Server Error");
      return res.redirect("/admin/dashboard");
    }
  },
  deleteProperty: async (req, res) => {
    const propertyId = req.params.id;
    try {
      // Find property by ID and delete it
      await Property.findByIdAndDelete(propertyId);
      req.flash("success", "Property deleted successfully.");
      return res.redirect("/admin/dashboard");
    } catch (error) {
      console.error("Error deleting property:", error);
      req.flash("error", "Failed to delete property.");
      return res.redirect("/admin/dashboard");
    }
  },

  addCategory: async (req, res) => {
    const { name, description } = req.body;

    // Check if an admin user is logged in
    if (!req.session.isAdmin) {
      req.flash("error", "You are not authorized to perform this action");
      return res.redirect("/admin/login");
    }

    try {
      if (!name || !description) {
        req.flash("error", "Please provide both name and description");
        return res.redirect("/admin/dashboard");
      }

      // Normalize the category name by converting to lowercase and removing whitespace
      const normalizedCategoryName = name.toLowerCase().replace(/\s+/g, "");

      // Check if the category already exists (case-insensitive, ignoring whitespace)
      const existingCategory = await Category.findOne({
        normalizedName: normalizedCategoryName,
      });

      if (existingCategory) {
        req.flash("error", "Category already exists");
        return res.redirect("/admin/dashboard");
      }

      const newCategory = new Category({
        name: name.trim(), // Save the original name with proper case and spacing
        description: description.trim(),
        normalizedName: normalizedCategoryName, // Store the normalized name for future checks
      });

      await newCategory.save();
      req.flash("success", "Category added successfully");
      return res.redirect("/admin/dashboard");
    } catch (error) {
      console.error("Error adding category:", error);
      req.flash("", "Failed to add category");
      return res.redirect("/admin/dashboard");
    }
  },

  deleteCategory: async (req, res) => {
    const categoryId = req.params.id;

    try {
      // Delete the category from the database
      await Category.findByIdAndDelete(categoryId);

      // Flash success message
      req.flash("success", "Category deleted successfully.");
      return res.redirect("/admin/dashboard");
    } catch (error) {
      console.error("Error deleting category:", error);
      req.flash("error", "Failed to delete category.");
      return res.redirect("/admin/dashboard");
    }
  },
  listOwners: async (req, res) => {
    try {
      const owners = await Owner.find();
      return res.render("adminDashboard", { owners });
    } catch (error) {
      console.error("Error listing owners:", error);
      req.flash("error", "Failed to list owners.");
      return res.redirect("/admin/dashboard");
    }
  },

  blockOwner: async (req, res) => {
    try {
      const ownerId = req.params.id; // Change from req.params.ownerId to req.params.id
      const owner = await Owner.findById(ownerId);

      if (!owner) {
        req.flash("error", "Owner not found.");
        return res.redirect("/admin/dashboard");
      }

      owner.isBlocked = true;
      await owner.save();

      req.flash("success", "Owner blocked successfully.");
      return res.redirect("/admin/dashboard");
    } catch (error) {
      console.error("Error blocking owner:", error);
      req.flash("error", "Failed to block owner.");
      return res.redirect("/admin/dashboard");
    }
  },

  unblockOwner: async (req, res) => {
    try {
      const ownerId = req.params.id; // Change from req.params.ownerId to req.params.id
      const owner = await Owner.findById(ownerId);

      if (!owner) {
        req.flash("error", "Owner not found.");
        return res.redirect("/admin/dashboard");
      }

      owner.isBlocked = false;
      await owner.save();

      req.flash("success", "Owner unblocked successfully.");
      return res.redirect("/admin/dashboard");
    } catch (error) {
      console.error("Error unblocking owner:", error);
      req.flash("error", "Failed to unblock owner.");
      return res.redirect("/admin/dashboard");
    }
  },

  logout: (req, res) => {
    try {
      // Check if session exists
      if (!req.session) {
        throw new Error("Session not available");
      }

      // Flash success message
      req.flash("success", "Signed out successfully");

      // Destroy the session
      req.session.destroy((err) => {
        if (err) {
          console.error("Error logging out:", err);
          // Handle error if session destruction fails
          req.flash("error", "Failed to log out");
        }
        // Redirect after session destruction
        res.redirect("/admin/login");
      });
    } catch (error) {
      console.error("Error logging out:", error);
      req.flash("error", "Failed to log out");
      res.redirect("/admin/login");
    }
  },
  blockUser: async (req, res) => {
    try {
      const userId = req.params.id;

      // Find the user by ID and update isBlocked field to true
      await User.findByIdAndUpdate(userId, { isBlocked: true });

      req.flash("success", "User blocked successfully.");
      return res.redirect("/admin/dashboard");
    } catch (error) {
      console.error("Error blocking user:", error);
      req.flash("error", "Failed to block user.");
      return res.redirect("/admin/dashboard");
    }
  },

  unblockUser: async (req, res) => {
    try {
      const userId = req.params.id;

      // Find the user by ID and update isBlocked field to false
      await User.findByIdAndUpdate(userId, { isBlocked: false });

      req.flash("success", "User unblocked successfully.");
      return res.redirect("/admin/dashboard");
    } catch (error) {
      console.error("Error unblocking user:", error);
      req.flash("error", "Failed to unblock user.");
      return res.redirect("/admin/dashboard");
    }
  },
  getEditCategoryPage: async (req, res) => {
    try {
      const categoryId = req.params.categoryId;
      const category = await Category.findById(categoryId);
      const admin = await User.findOne({ email: req.session.admin.email });

      if (!admin) {
        req.flash("error", "Admin not found");
        return res.redirect("/admin/login");
      }

      const flashMessages = {
        error: req.flash("error"),
        success: req.flash("success"),
      };

      if (req.session.admin) {
        res.render("admin/editCategory", {
          admin,
          category,
          error: flashMessages.error,
          success: flashMessages.success,
        });
      } else {
        res.render("admin/adminLogin", {
          error: "You are not authorized to access this page",
        });
      }
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).send("Internal Server Error");
    }
  },

  updateCategory: async (req, res) => {
    const categoryId = req.params.categoryId;
    const { name, description } = req.body;

    // Check if an admin user is logged in
    if (!req.session.isAdmin) {
      req.flash("error", "You are not authorized to perform this action");
      return res.redirect("/admin/login");
    }

    try {
      if (!name || !description) {
        req.flash("error", "Please provide both name and description");
        return res.redirect(`/admin/categories/${categoryId}/edit`);
      }

      // Normalize the category name by converting to lowercase and removing whitespace
      const normalizedCategoryName = name.toLowerCase().replace(/\s+/g, "");

      // Check if another category already exists with the new name (case-insensitive, ignoring whitespace)
      const existingCategory = await Category.findOne({
        normalizedName: normalizedCategoryName,
        _id: { $ne: categoryId }, // Exclude the current category from the check
      });

      if (existingCategory) {
        req.flash("error", "Category with this name already exists");
        return res.redirect(`/admin/categories/${categoryId}/edit`);
      }

      // Find the category by ID and update its name and description
      const updatedCategory = await Category.findByIdAndUpdate(
        categoryId,
        {
          name: name.trim(), // Save the original name with proper case and spacing
          description: description.trim(),
          normalizedName: normalizedCategoryName, // Update the normalized name for future checks
        },
        { new: true }
      );

      if (!updatedCategory) {
        req.flash("error", "Category not found");
        return res.redirect("/admin/dashboard"); // Redirect to dashboard with error flash message
      }

      // Category updated successfully
      req.flash("success", "Category updated successfully");
      return res.redirect("/admin/dashboard"); // Redirect to dashboard with success flash message
    } catch (err) {
      console.error("Error updating category:", err);
      req.flash("error", "Internal server error");
      return res.redirect(`/admin/categories/${categoryId}/edit`); // Redirect to edit page with error flash message
    }
  },
  cancelBooking: async (req, res) => {
    try {
      const bookingId = req.params.id;
      // Find the booking by ID
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        req.flash("error", "Booking not found");
        return res.status(404).redirect("/admin/dashboard");
      }

      // Update booking status to "Cancelled"
      booking.bookingStatus = "Cancelled";
      await booking.save();

      req.flash("success", "Booking cancelled successfully");
      return res.redirect("/admin/dashboard"); // Redirect back to the dashboard or any other appropriate route
    } catch (err) {
      console.error(err);
      req.flash("error", "Internal Server Error");
      return res.status(500).redirect("/admin/dashboard");
    }
  },
  createCoupon: async (req, res) => {
    try {
      // Extract coupon data from request body
      const { couponName, category, expirationDate, fixedValue, payMethod } =
        req.body;
      const alphanumericPattern = /^[a-zA-Z0-9]+$/;

      // Check if the coupon name matches the alphanumeric pattern
      if (!alphanumericPattern.test(couponName)) {
        req.flash(
          "error",
          "Coupon name can only contain alphanumeric characters"
        );
        return res.redirect("/admin/dashboard"); // Redirect back to the dashboard with an error message
      }

      // Check if the coupon already exists
      const existingCoupon = await Coupon.findOne({
        code: couponName.toUpperCase(),
      });
      if (existingCoupon) {
        req.flash("error", "Coupon with the same code already exists");
        return res.redirect("/admin/dashboard"); // Redirect back to the dashboard with an error message
      }

      // Save the new coupon to the database
      const coupon = await Coupon.create({
        code: couponName.toUpperCase(), // Convert coupon name to uppercase
        category,
        expirationDate,
        fixedValue, // Add the fixed value to the coupon
        payMethod, // Add the payment method to the coupon
        used: false, // Assuming the coupon is initially not used
      });

      // Redirect to a success page or send a success response
      req.flash("success", "Coupon created successfully");
      res.redirect("/admin/dashboard");
    } catch (error) {
      console.error("Error creating coupon:", error);
      // Handle errors appropriately, e.g., send an error response
      req.flash("error", "An error occurred while creating the coupon");
      res.redirect("/admin/dashboard");
    }
  },

  updateCoupon: async (req, res) => {
    try {
      const { id } = req.params;
      const { code, category, expirationDate, fixedValue, payMethod } =
        req.body;

      // Check if a coupon with the same name already exists
      const existingCoupon = await Coupon.findOne({
        code: code.toUpperCase(),
        _id: { $ne: id },
      });
      if (existingCoupon) {
        req.flash("error", "A coupon with the same name already exists");
        return res.redirect("/admin/dashboard");
      }

      // Find the coupon by ID and update its details
      const updatedCoupon = await Coupon.findByIdAndUpdate(id, {
        code: code.toUpperCase(),
        category: category, // Assuming category is the category ID
        expirationDate: expirationDate,
        fixedValue: fixedValue,
        payMethod: payMethod,
      });

      if (!updatedCoupon) {
        req.flash("error", "Coupon not found");
        return res.redirect("/admin/dashboard");
      }

      req.flash("success", "Coupon updated successfully");
      res.redirect("/admin/dashboard");
    } catch (error) {
      console.error("Error updating coupon:", error);
      req.flash("error", "An error occurred while updating the coupon");
      res.redirect("/admin/dashboard");
    }
  },

  deleteCoupon: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedCoupon = await Coupon.findByIdAndDelete(id);
      if (!deletedCoupon) {
        req.flash("error", "Coupon not found");
      } else {
        req.flash("success", "Coupon deleted successfully");
      }
      res.redirect("/admin/dashboard"); // Redirect to the dashboard or any other page
    } catch (error) {
      console.error("Error deleting coupon:", error);
      req.flash("error", "An error occurred while deleting the coupon");
      res.redirect("/admin/dashboard");
    }
  },
  getDailyRevenue: async (req, res) => {
    const { year, month } = req.query;
    try {
      const dailyRevenueData = await Booking.aggregate([
        {
          $match: {
            $expr: {
              $and: [
                { $eq: [{ $year: "$dateInitiated" }, parseInt(year)] },
                { $eq: [{ $month: "$dateInitiated" }, parseInt(month)] },
              ],
            },
          },
        },
        {
          $group: {
            _id: { $dayOfMonth: "$dateInitiated" },
            totalRevenue: { $sum: "$price" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      res.json(dailyRevenueData);
    } catch (error) {
      console.error("Error fetching daily revenue:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  getMonthlyRevenue: async (req, res) => {
    const { year, month } = req.query;
    try {
      const monthlyRevenueData = await Booking.aggregate([
        {
          $match: {
            $expr: {
              $and: [
                { $eq: [{ $year: "$dateInitiated" }, parseInt(year)] },
                { $eq: [{ $month: "$dateInitiated" }, parseInt(month)] },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$price" },
          },
        },
      ]);
      res.json(monthlyRevenueData);
    } catch (error) {
      console.error("Error fetching monthly revenue:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  getYearlyRevenue: async (req, res) => {
    const { year } = req.query;
    try {
      const yearlyRevenueData = await Booking.aggregate([
        {
          $match: {
            $expr: { $eq: [{ $year: "$dateInitiated" }, parseInt(year)] },
          },
        },
        {
          $group: {
            _id: { $month: "$dateInitiated" },
            totalRevenue: { $sum: "$price" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      res.json(yearlyRevenueData);
    } catch (error) {
      console.error("Error fetching yearly revenue:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
};

module.exports = adminController;
