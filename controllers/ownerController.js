const bcrypt = require("bcrypt");
const Owner = require("../models/owner");
const Property = require("../models/property");
const Category = require("../models/category");
const Booking = require("../models/booking");
const { check, validationResult } = require('express-validator');
const {
  uploadProfilePicture,
  uploadPropertyImage,
} = require("../middleware/multer");

const ownerController = {

  loginPost: [
    // Validation and sanitization middleware
    check("email")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    check("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long")
      .trim()
      .escape(),

    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessage = errors
          .array()
          .map((err) => err.msg)
          .join(", ");
        req.flash("error", errorMessage);
        return res.render("propertyOwner/ownerLogin", {
          errorMessage: req.flash("error"),
          successMessage: req.flash("success"),
        });
      }

      const { email, password } = req.body;
      try {
        const owner = await Owner.findOne({ email });
        if (!owner || !bcrypt.compareSync(password, owner.password)) {
          req.flash("error", "Invalid email or password");
          return res.render("propertyOwner/ownerLogin", {
            errorMessage: req.flash("error"),
            successMessage: req.flash("success"),
          });
        }

        if (owner.isBlocked) {
          req.flash(
            "error",
            "Your account has been blocked. Please contact support."
          );
          return res.render("propertyOwner/ownerLogin", {
            errorMessage: req.flash("error"),
            successMessage: req.flash("success"),
          });
        }

        req.session.owner = owner;
        return res.redirect(req.session.returnTo || "/owner/dashboard");
      } catch (error) {
        console.error("Error logging in:", error);
        req.flash("error", "Internal Server Error");
        return res.redirect("/owner/login");
      }
    },
  ],

  handleSignup: [
    // Validation and sanitization middleware
    check("fullname")
      .notEmpty()
      .withMessage("Full name is required")
      .trim()
      .escape(),
    check("email")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    check("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long")
      .trim()
      .escape(),
    check("phoneNumber")
      .isMobilePhone()
      .withMessage("Invalid phone number")
      .trim()
      .escape(),

    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessage = errors
          .array()
          .map((err) => err.msg)
          .join(", ");
        req.flash("error", errorMessage);
        return res.render("propertyOwner/ownerSignup", {
          errorMessage: req.flash("error"),
          successMessage: req.flash("success"),
        });
      }

      const { fullname, email, password, phoneNumber } = req.body;

      try {
        const existingOwner = await Owner.findOne({ email });
        if (existingOwner) {
          req.flash(
            "error",
            "Email already exists. Please use a different email."
          );
          return res.render("propertyOwner/ownerSignup", {
            errorMessage: req.flash("error"),
            successMessage: req.flash("success"),
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newOwner = new Owner({
          fullname,
          email,
          password: hashedPassword,
          phoneNumber,
        });

        await newOwner.save();

        req.flash("success", "Signup successful! Please login to continue.");
        return res.redirect("/owner/login");
      } catch (error) {
        console.error("Error handling signup:", error);
        req.flash("error", "Internal Server Error");
        return res.redirect("/owner/signup");
      }
    },
  ],

  renderLogin: (req, res) => {
    // Check if owner session exists
    if (req.session.owner) {
      // If session exists, redirect to owner dashboard
      return res.redirect("/owner/dashboard");
    }

    // Store the returnTo path
    req.session.returnTo = req.originalUrl;

    // Render login page
    res.render("propertyOwner/ownerLogin", {
      errorMessage: req.flash("error"),
      successMessage: req.flash("success"),
    });
  },

  renderSignup: (req, res) => {
    // Check if owner session exists
    if (req.session.owner) {
      // If session exists, redirect to owner dashboard
      return res.redirect("/owner/dashboard");
    }

    // Render signup page
    res.render("propertyOwner/ownerSignup", {
      errorMessage: req.flash("error"),
      successMessage: req.flash("success"),
    });
  },

  fetchProperties: async (req, res) => {
    try {
      if (!req.session.owner) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const properties = await Property.find({ owner: req.session.owner._id });
      return res.json(properties);
    } catch (error) {
      console.error("Failed to fetch properties:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },

  renderDashboard: async (req, res) => {
    try {
      // Fetch categories from the database
      const categories = await Category.find();

      // Fetch the owner details from the session
      const owner = req.session.owner;
      if (!owner) {
        req.flash("error", "Owner details not found.");
        return res.redirect("/owner/login");
      }

      // Fetch properties associated with the owner
      const properties = await Property.find({ owner: owner._id });

      // Calculate total properties owned by the owner
      const totalProperties = properties.length;
      const bookings = await Booking.find({
        property: { $in: properties.map((property) => property._id) },
      }).populate("property");

      // Calculate total bookings
      const totalBookings = bookings.length;

      // Render the dashboard template with owner details, categories, and properties
      return res.render("propertyOwner/ownerDashboard", {
        owner,
        categories,
        properties,
        totalProperties,
        bookings,
        totalBookings,
        // Pass flash messages to the view
        successMessage: req.flash("success"),
        errorMessage: req.flash("error"),
      });
    } catch (error) {
      console.error("Error rendering dashboard:", error);
      req.flash("error", "Internal Server Error");
      return res.redirect("/owner/login");
    }
  },

  addProperty: async (req, res) => {
    try {
      if (!req.session.owner) {
        req.flash("error", "Owner session not found. Please login again.");
        return res.redirect("/owner/login");
      }

      const {
        propertyName,
        categoryName,
        description,
        roomFacilities,
        address,
        price,
      } = req.body;

      const ownerId = req.session.owner._id;

      if (
        !propertyName ||
        !categoryName ||
        !description ||
        !address ||
        !price
      ) {
        req.flash("error", "All fields are required.");
        return res.redirect("/owner/dashboard");
      }

      console.log("req.files:", req.files); // Debugging log

      if (!req.files || req.files.length === 0) {
        req.flash("error", "Property images are required.");
        return res.redirect("/owner/dashboard");
      }

      const images = req.files.map(
        (file) => `/uploads/properties/${file.filename}`
      );

      const newProperty = new Property({
        propertyName,
        categoryName,
        description,
        roomFacilities,
        address,
        images,
        price,
        owner: ownerId,
        approvalStatus: "Pending",
      });
      console.log("NewProperty : ", newProperty);
      await newProperty.save();

      req.flash(
        "success",
        "Property added successfully. Waiting for admin approval."
      );
      return res.redirect("/owner/dashboard");
    } catch (error) {
      console.error("Error adding property:", error);
      req.flash("error", "Failed to add property. Please try again.");
      return res.redirect("/owner/dashboard");
    }
  },

  updateAvailability: async (req, res) => {
    try {
      const propertyId = req.params.propertyId;
      const isListButton = req.body.isListButton === "true";
  
      // Fetch the property details by ID
      const property = await Property.findById(propertyId);
  
      if (!property) {
        req.flash("error", "Property not found.");
        return res.redirect("/owner/dashboard");
      }
  
      // Update the availability of the property
      property.availability = isListButton;
      await property.save();
  
      // Set flash message based on availability status
      req.flash("success", `Property ${isListButton ? 'listed' : 'unlisted'} successfully.`);
  
      // Redirect back to dashboard
      return res.redirect("/owner/dashboard");
    } catch (error) {
      console.error("Error updating availability:", error);
      req.flash("error", "Failed to update property availability.");
      return res.redirect("/owner/dashboard");
    }
  },
  cancelBooking: async (req, res) => {
    const bookingId = req.params.bookingId;

    try {
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        req.flash("error", "Booking not found.");
        return res.redirect("/owner/dashboard");
      }

      // Update booking status to "Cancelled"
      booking.bookingStatus = "Cancelled";

      // Save the updated booking
      await booking.save();

      // Set success flash message
      req.flash("success", "Booking successfully cancelled.");

      // Redirect back to dashboard or any other appropriate page
      return res.redirect("/owner/dashboard");
    } catch (error) {
      console.error("Error cancelling booking:", error);
      req.flash("error", "Failed to cancel booking. Please try again.");
      return res.redirect("/owner/dashboard");
    }
  },

  logout: (req, res) => {
    try {
      req.flash("success", "Logout successful.");
      // Destroy the owner sessionerrorMessage: req.flash("error"),
      successMessage: req.flash("success"),
        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
          }
          // Set success flash message for logout

          // Redirect to the login page after logout
          res.redirect("/owner/login");
        });
    } catch (error) {
      console.error("Error logging out:", error);
      req.flash("error", "Failed to logout. Please try again.");
      res.redirect("/owner/dashboard"); // Redirect to dashboard on error
    }
  },

  deleteProperty: async (req, res) => {
    try {
      const propertyId = req.params.propertyId;

      // Delete the property from the database
      await Property.findByIdAndDelete(propertyId);

      // Set success flash message
      req.flash("success", "Property deleted successfully.");

      // Redirect back to dashboard or any other appropriate page
      res.redirect("/owner/dashboard");
    } catch (error) {
      console.error("Error deleting property:", error);
      req.flash("error", "Failed to delete property.");
      res.redirect("/owner/dashboard");
    }
  },

  renderEditProperty: async (req, res) => {
    try {
      if (!req.session.owner) {
        req.flash("error", "Unauthorized access.");
        return res.redirect("/owner/login");
      }
      const propertyId = req.params.id;
      const property = await Property.findById(propertyId);
      const roomFacilities = [
        "Seating Area",
        "Smoking Room",
        "King Sized Bed",
        "Queen Sized Bed",
        "Twin Single Bed",
        "Swimming Pool",
        "Sea View",
        "AC",
        "Kitchen",
        "Coffee/Tea Maker",
        "Roof-Top pool",
        "Game Console",
        "Mountain View",
      ];
      const categories = await Category.find();

      res.render("propertyOwner/editProperty", {
        property,
        categories,
        messages: req.flash("info"),
        roomFacilities,
      });
    } catch (err) {
      req.flash("error", "Error fetching property details");
      res.redirect("/owner/dashboard");
    }
  },
  editProperty: async (req, res) => {
    try {
      const propertyId = req.params.id;
      const {
        propertyName,
        categoryName,
        description,
        roomFacilities,
        address,
        price,
        existingImages = [],
      } = req.body;
      console.log("Edit property :", req.body);
      // Handle newly uploaded images
      let newImages = [];
      if (req.files) {
        newImages = req.files.map(
          (file) => `/uploads/properties/${file.filename}`
        );
      }
      console.log("newImage");
      // Combine existing and new images
      const images = [...existingImages, ...newImages];

      console.log("Validation passes");
      // Find the property by ID and update its details
      await Property.findByIdAndUpdate(propertyId, {
        propertyName,
        categoryName,
        description,
        roomFacilities,
        address,
        price,
        images,
      });
      console.log("Saved");
      req.flash("success", "Property details updated successfully.");
      return res.redirect("/owner/dashboard");
    } catch (error) {
      console.error("Error editing property:", error);
      req.flash("error", "Failed to update property details.");
      return res.redirect(`/owner/dashboard/editProperty/${req.params.id}`);
    }
  },
  renderEditProfilePage: (req, res) => {
    try {
      const owner = req.session.owner;
      if (!owner) {
        req.flash("error", "Owner details not found.");
        return res.redirect("/owner/login");
      }
      res.render("propertyOwner/editProfile", {
        owner,
        successMessage: req.flash("success"),
        errorMessage: req.flash("error"),
      });
    } catch (error) {
      console.error("Error rendering edit profile page:", error);
      req.flash("error", "Failed to load profile edit page.");
      return res.redirect("/owner/dashboard");
    }
  },

  updateProfile: [
    async (req, res) => {
      try {
        const { fullName, phoneNumber } = req.body;
        const profilePicture = req.file;

        // Validate full name
        const fullNameRegex = /^[a-zA-Z\s]+$/;
        if (!fullNameRegex.test(fullName)) {
          req.flash(
            "error",
            "Full name should only contain alphabets and spaces."
          );
          return res.redirect("/owner/editProfile");
        }

        // Validate phone number
        const phoneNumberRegex = /^\d{10}$/;
        if (!phoneNumberRegex.test(phoneNumber)) {
          req.flash(
            "error",
            "Phone number should contain only numbers and must be 10 digits long."
          );
          return res.redirect("/owner/editProfile");
        }

        if (!req.session.owner) {
          req.flash("error", "Unauthorized access.");
          return res.redirect("/owner/login");
        }

        const owner = await Owner.findById(req.session.owner._id);
        if (!owner) {
          req.flash("error", "Owner not found.");
          return res.redirect("/owner/editProfile");
        }

        owner.fullname = fullName;
        owner.phoneNumber = phoneNumber;
        if (profilePicture) {
          owner.profilePicture = `/uploads/${profilePicture.filename}`;
          req.session.owner.profilePicture = owner.profilePicture;
        }

        await owner.save();

        req.flash("success", "Profile updated successfully.");
        return res.redirect("/owner/editProfile");
      } catch (error) {
        console.error("Failed to update profile:", error);
        req.flash("error", "Failed to update profile.");
        return res.redirect("/owner/editProfile");
      }
    },
  ],

  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!req.session.owner) {
        req.flash("error", "Unauthorized access.");
        return res.redirect("/owner/login");
      }

      const owner = await Owner.findById(req.session.owner._id);
      if (!owner) {
        req.flash("error", "Owner not found.");
        return res.redirect("/owner/editProfile");
      }

      // Check if current password matches the stored hashed password
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        owner.password
      );
      if (!isPasswordValid) {
        req.flash("error", "Current password is incorrect.");
        return res.redirect("/owner/changePassword");
      }

      // Validate new password format
      const passwordRegex =
        /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        req.flash(
          "error",
          "New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one symbol, and one number."
        );
        return res.redirect("/owner/changePassword");
      }

      // Check if new password and confirm password match
      if (newPassword !== confirmPassword) {
        req.flash("error", "New password and confirm password do not match.");
        return res.redirect("/owner/changePassword");
      }

      if (currentPassword === newPassword) {
        req.flash(
          "error",
          "New password cannot be the same as the current password."
        );
        return res.redirect("/owner/changePassword");
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      owner.password = hashedPassword;

      // Save the updated owner object
      await owner.save();

      req.flash("success", "Password updated successfully.");
      return res.redirect("/owner/changePassword");
    } catch (error) {
      console.error("Failed to update password:", error);
      req.flash("error", "Failed to update password.");
      return res.redirect("/owner/changePassword");
    }
  },
  renderChangePasswordPage: (req, res) => {
    try {
      if (!req.session.owner) {
        req.flash("error", "Unauthorized access.");
        return res.redirect("/owner/login");
      }
      res.render("propertyOwner/changePassword", {
        successMessage: req.flash("success"),
        errorMessage: req.flash("error"),
        // Pass any data you need to the view
      });
    } catch (error) {
      console.error("Error rendering change password page:", error);
      req.flash("error", "Failed to load change password page.");
      return res.redirect("/owner/changePassword");
    }
  },
};

module.exports = ownerController;
