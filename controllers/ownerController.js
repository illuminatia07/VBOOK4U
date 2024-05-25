const bcrypt = require("bcrypt");
const Owner = require("../models/owner");
const Property = require("../models/property");
const Category = require("../models/category");
const Booking = require("../models/booking");

const ownerController = {
  loginPost: async (req, res) => {
    const { email, password } = req.body;
    try {
      const owner = await Owner.findOne({ email });
      if (!owner) {
        req.flash("error", "Invalid email or password");
        return res.render("propertyOwner/ownerLogin", {
          errorMessage: req.flash("error"),
          successMessage: req.flash("success"),
        });
      }
      // Check if the owner is blocked
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

      if (bcrypt.compareSync(password, owner.password)) {
        // Create a session for the owner
        req.session.owner = owner;

        // Redirect to the dashboard
        return res.redirect(req.session.returnTo || "/owner/dashboard");
      } else {
        req.flash("error", "Invalid email or password");
        return res.render("propertyOwner/ownerLogin", {
          errorMessage: req.flash("error"),
          successMessage: req.flash("success"),
        });
      }
    } catch (error) {
      console.error("Error logging in:", error);
      req.flash("error", "Internal Server Error");
      return res.redirect("/owner/login");
    }
  },

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

  handleSignup: async (req, res) => {
    try {
      const { fullname, email, password, phoneNumber } = req.body;

      // Check if the email already exists in the database
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

      // Hash the password before saving to the database
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new owner object
      const newOwner = new Owner({
        fullname,
        email,
        password: hashedPassword,
        phoneNumber,
      });

      // Save the new owner to the database
      await newOwner.save();

      // Set success flash message and redirect to login page
      req.flash("success", "Signup successful! Please login to continue.");
      return res.redirect("/owner/login");
    } catch (error) {
      console.error("Error handling signup:", error);
      req.flash("error", "Internal Server Error");
      return res.redirect("/owner/signup");
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
      // Check if owner session exists
      if (!req.session.owner) {
        req.flash("error", "Owner session not found. Please login again.");
        return res.redirect("/owner/login");
      }

      // Get property details from the request body
      const {
        propertyName,
        categoryName,
        description,
        roomFacilities,
        address,
        price,
        images,
      } = req.body;

      // Get the owner ID from the session
      const ownerId = req.session.owner._id;

      // Validate input fields
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

      // Create a new property object with approval status as "Pending"
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

      // Save the new property to the database
      await newProperty.save();

      // Notify admin about the new property addition request
      // Code for sending notification to admin goes here

      // Set success flash message and redirect to dashboard
      req.flash(
        "success",
        "Property added successfully. Waiting for admin approval."
      );
      return res.redirect("/owner/dashboard");
    } catch (error) {
      console.error("Error adding property:", error);
      req.flash("error", "Failed to add property. Please try again.");
      return res.redirect("/owner/dashboard"); // Redirect to dashboard on error
    }
  },
  updateAvailability: async (req, res) => {
    try {
      const propertyId = req.params.propertyId;
      const isListButton = req.body.isListButton === "true"; // Convert string to boolean

      // Fetch the property details by ID
      const property = await Property.findById(propertyId);

      if (!property) {
        // Handle property not found
        req.flash("error", "Property not found.");
        return res.redirect("/owner/dashboard");
      }

      // Update the availability of the property based on button clicked
      property.availability = isListButton;
      await property.save();

      // Set flash message based on availability status
      if (isListButton) {
        req.flash("success", "Property listed successfully.");
      } else {
        req.flash("success", "Property unlisted successfully.");
      }

      // Redirect back to dashboard
      return res.redirect("/owner/dashboard");
    } catch (error) {
      console.error("Error updating availability:", error);
      req.flash("error", "Failed to update property availability.");
      return res.redirect("/dashboard/updateAvailability");
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

  editProperty: async (req, res) => {
    try {
      const propertyId = req.params.propertyId;
      // Get updated property details from the request body
      const {
        propertyName,
        categoryName,
        description,
        roomFacilities,
        address,
        price,
        images,
      } = req.body;

      // Define regex patterns for validation
      const nameRegex = /^[a-zA-Z0-9\s]+$/; // Alphanumeric with spaces allowed
      const addressRegex = /^[a-zA-Z0-9\s,-]+$/; // Alphanumeric with spaces, commas, and hyphens allowed
      const descriptionRegex = /^[a-zA-Z0-9\s.,-]+$/; // Alphanumeric with spaces, commas, periods, and hyphens allowed

      // Server-side validation
      if (
        !nameRegex.test(propertyName) ||
        !categoryName ||
        !descriptionRegex.test(description) ||
        !addressRegex.test(address) ||
        !price ||
        isNaN(Number(price)) || // Check if price is a valid number
        Number(price) <= 0 // Check if price is greater than zero
      ) {
        console.log("Validation enteed")
        req.flash(
          "error",
          "Invalid input. Please provide valid data for all fields."
        );
        return res.redirect("/owner/dashboard");
      }

      // Find the property by ID and update its details
      await Property.findByIdAndUpdate(propertyId, {
        propertyName,
        categoryName,
        description,
        roomFacilities,
        address,
        price,
        images,
        // Add more fields as needed
      });

      req.flash("success", "Property details updated successfully.");
      return res.redirect("/owner/dashboard");
    } catch (error) {
      console.error("Error editing property:", error);
      req.flash("error", "Failed to update property details.");
      return res.redirect("/owner/dashboard");
    }
  },
  updateProfile: async (req, res) => {
    try {
      const { fullName, phoneNumber } = req.body;

      // Fetch the owner details from the session
      const owner = req.session.owner;
      if (!owner) {
        req.flash("error", "Owner details not found.");
        return res.redirect("/owner/login");
      }
      console.log("req.body:", req.body); // Log the request body
      console.log(fullName, phoneNumber); // Log the fullName and phoneNumber
      if (!/^[A-Za-z -]+$/.test(fullName)) {
        req.flash(
          "error",
          "Please enter a valid name (letters, spaces, and hyphens only)"
        );
        return res.redirect("/owner/dashboard");
      }

      // Validate phone number
      if (!/^[0-9]{10}$/.test(phoneNumber)) {
        req.flash(
          "error",
          "Please enter a valid phone number (10 digits only)"
        );
        return res.redirect("/owner/dashboard");
      }

      // Update owner profile with new details
      const updatedOwner = await Owner.findByIdAndUpdate(
        owner._id,
        {
          fullname: fullName,
          phoneNumber: phoneNumber,
        },
        { new: true } // Return the updated document
      );
      console.log("updatedOwner:", updatedOwner); // Log the updatedOwner object

      // Update session with new owner details
      req.session.owner = updatedOwner;

      req.flash("success", "Profile updated successfully.");
      return res.redirect("/owner/dashboard");
    } catch (error) {
      console.error("Error updating profile:", error);
      req.flash("error", "Failed to update profile details.");
      return res.redirect("/owner/dashboard");
    }
  },
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      console.log("req body : ", req.body);

      // Check if new password matches confirm password
      if (newPassword !== confirmPassword) {
        console.log("this password not match");
        req.flash("error", "New password and confirm password do not match");
        return res.redirect("/owner/dashboard"); // Redirect to dashboard or any appropriate route
      }

      // Fetch owner from database using their ID
      const ownerId = req.session.owner._id; // Assuming ownerId is stored in the session
      const owner = await Owner.findById(ownerId);
      console.log(ownerId);
      // Check if owner exists
      if (!owner) {
        req.flash("error", "Owner not found");
        return res.redirect("/owner/dashboard"); // Redirect to dashboard or any appropriate route
      }

      // Check if current password matches
      const isMatch = await bcrypt.compare(currentPassword, owner.password);
      if (!isMatch) {
        console.log("isMatch entered");
        req.flash("error", "Current password is incorrect");
        return res.redirect("/owner/dashboard"); // Redirect to dashboard or any appropriate route
      }

      // Validate new password format
      const passwordRegex =
        /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+}{"':;?/>.<,])(?!.*\s).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        req.flash(
          "error",
          "New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
        );
        return res.redirect("/owner/dashboard"); // Redirect to dashboard or any appropriate route
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update owner's password in the database
      const newOwner = await Owner.findByIdAndUpdate(ownerId, {
        password: hashedPassword,
      });
      console.log("NewOwner :", newOwner);

      req.flash("success", "Password updated successfully");
      res.redirect("/owner/dashboard"); // Redirect to dashboard or any appropriate route
    } catch (error) {
      console.error("Error changing password:", error);
      req.flash("error", "An internal server error occurred");
      res.redirect("/owner/dashboard"); // Redirect to dashboard or any appropriate route
    }
  },
  renderEditProperty: async (req, res) => {
    try {
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

  updateProperty: async (req, res) => {
    try {
      // Extract the propertyId from the request parameters
      const propertyId = req.params.propertyId;
      console.log("Property ID:", propertyId);

      // Destructure properties from the request body
      const {
        propertyName,
        categoryName,
        description,
        roomFacilities, // Make sure this field contains an array of strings
        address,
        price,
      } = req.body;

      console.log( "req :",req.body);

      // Handle existing images
      let existingImages = [];
      if (req.body.existingImages) {
        existingImages = req.body.existingImages;
      }

      // Handle newly uploaded images
      let newImages = [];
      if (req.files) {
        newImages = req.files.map((file) => file.filename);
      }
      console.log("newImages");
      // Combine existing and new images
      const images = [...existingImages, ...newImages];

      // Define regex patterns for validation
      const nameRegex = /^[a-zA-Z0-9\s]+$/; // Alphanumeric with spaces allowed
      const addressRegex = /^[a-zA-Z0-9\s,-]+$/; // Alphanumeric with spaces, commas, and hyphens allowed
      const descriptionRegex = /^[a-zA-Z0-9\s.,-]+$/; // Alphanumeric with spaces, commas, periods, and hyphens allowed

      // Server-side validation
      // if (
       
      //   !nameRegex.test(propertyName) ||
      //   !categoryName ||
      //   !descriptionRegex.test(description) ||
      //   !addressRegex.test(address) ||
      //   !price ||
      //   isNaN(Number(price)) || // Check if price is a valid number
      //   Number(price) <= 0 // Check if price is greater than zero
      // ) {
      //   console.log("Validation entered");
      //   req.flash(
      //     "error",
      //     "Invalid input. Please provide valid data for all fields."
      //   );
      //   return res.redirect("/owner/dashboard");
      // }

      // Find the property by ID and update its details
      const updatedProperty = await Property.findByIdAndUpdate(
        propertyId,
        {
          propertyName,
          categoryName,
          description,
          roomFacilities, // Update the roomFacilities field with the new array
          address,
          price,
          images,
          // Add more fields as needed
        },
        { new: true } // Added { new: true } to return the updated document
      );

      // Log the updated property to verify changes
      console.log("Updated Property:", updatedProperty);

      // Redirect to dashboard after successful update
      req.flash("success", "Property details updated successfully.");
      return res.redirect("/owner/dashboard");
    } catch (error) {
      // Handle errors
      console.error("Error editing property:", error);
      req.flash("error", "Failed to update property details.");
      return res.redirect("/owner/dashboard");
    }
  },
  removeImage: async (req, res) => {
    try {
      const { propertyId, imageName } = req.body;

      // Find the property document and update the images array
      const property = await Property.findByIdAndUpdate(
        propertyId,
        { $pull: { images: imageName } },
        { new: true }
      );

      if (!property) {
        req.flash('error', 'Property not found');
        return res.redirect('/owner/dashboard');
      }

      req.flash('success', 'Image removed from the property');
      return res.redirect('/owner/dashboard');
    } catch (error) {
      console.error('Error:', error);
      req.flash('error', 'Internal server error');
      return res.redirect('/owner/dashboard');
    }
  },
};

module.exports = ownerController;
