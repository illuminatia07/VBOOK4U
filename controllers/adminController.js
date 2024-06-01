// adminController.js
const bcrypt = require("bcrypt");
const User = require("../models/userAdmin");
const Category = require("../models/category"); // Import the Category model
const Property = require("../models/property"); // Import the Property model
const Owner = require("../models/owner");
const Booking = require("../models/booking"); // Import the Booking model

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
        const pendingRequests = await Property.find({ approvalStatus: "Pending" }).populate("owner");
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
    return res.redirect("/admin/requests");
  } catch (error) {
    console.error("Error rejecting request:", error);
    req.flash("error", "Failed to reject property.");
    return res.redirect("/admin/requests");
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
    return res.redirect("/admin/requests");
  } catch (error) {
    console.error("Error approving request:", error);
    req.flash("error", "Failed to approve property.");
    return res.redirect("/admin/requests");
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
        req.session.user = null; // Clear any existing user session
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
        const { email } = req.session.admin;
        const admin = await User.findOne({ email });
        const bookings = await Booking.find().populate("property").populate("user");

        if (!admin) {
            req.flash("error", "Admin not found");
            return res.redirect("/admin/login");
        }

        const categories = await Category.find();
        const pendingRequests = await Property.find({ approvalStatus: "Pending" }).populate("owner");
        const properties = await Property.find().populate("owner");
        const users = await User.find();

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
            categories,
            requests: pendingRequests,
            bookings,
            properties,
            users,
            messages: flashMessages,
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
                messages: flashMessages,
            });
        } else {
            res.render("admin/adminLogin", { error: "You are not authorized to this page" });
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
        _id: { $ne: categoryId } // Exclude the current category from the check
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
          normalizedName: normalizedCategoryName // Update the normalized name for future checks
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
  
};

module.exports = adminController;
