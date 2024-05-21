const bcrypt = require("bcrypt");
const Owner = require("../models/owner");
const Property = require("../models/property");
const Category = require("../models/category");

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
        req.flash("error", "Your account has been blocked. Please contact support.");
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
    req.session.returnTo = req.originalUrl; // Store the returnTo path
    res.render("propertyOwner/ownerLogin", {
      errorMessage: req.flash("error"),
      successMessage: req.flash("success"),
    });
},

  renderSignup: (req, res) => {
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

      // Render the dashboard template with owner details, categories, and properties
      return res.render("propertyOwner/ownerDashboard", {
        owner,
        categories,
        properties,
        totalProperties,
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
        req.flash("error", "Invalid input. Please provide valid data for all fields.");
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
      
};

module.exports = ownerController;
