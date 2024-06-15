const bcrypt = require("bcrypt");
const UserAdmin = require("../models/userAdmin");
const Category = require("../models/category");
const passport = require("../config/passport");
const mongoose = require("mongoose");
const isValidObjectId = mongoose.Types.ObjectId.isValid;
const Booking = require("../models/booking");
const Coupon = require("../models/coupon");
require("dotenv").config();
const { body, validationResult } = require("express-validator");
const twilio = require("twilio");
const Property = require("../models/property");
const { findOne } = require("../models/owner");
const decodeParam = (param) => decodeURIComponent(param || "");
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
  process.env.TWILIO_PERSONAL_NUMBER
);
const razorpay = require("razorpay");
const razorpayInstance = new razorpay({
  key_id: "rzp_test_KMrm8VgRyKa92K",
  key_secret: "KKfvq2OqDnHkSXpejhkqysar",
});
function getCurrentDate() {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0"); // January is 0!
  const yyyy = today.getFullYear();
  return yyyy + "-" + mm + "-" + dd;
}
function redirectWithQueryParams(res, baseUrl, params) {
  const queryParams = new URLSearchParams(params).toString();
  return res.redirect(`${baseUrl}?${queryParams}`);
}

const userController = {
  handleSignup: async (req, res, next) => {
    try {
      const { fullname, email, password, phoneNumber } = req.body;

      // Check if the email already exists in the database
      const existingEmail = await UserAdmin.findOne({ email });
      if (existingEmail) {
        req.flash(
          "error",
          "Email address is already in use. Please use a different email address."
        );
        return res.redirect("/signup");
      }

      // Check if the phone number already exists in the database
      const existingPhoneNumber = await UserAdmin.findOne({ phoneNumber });
      if (existingPhoneNumber) {
        req.flash(
          "error",
          "Phone number is already in use. Please use a different phone number."
        );
        return res.redirect("/signup");
      }

      // Generate OTP (You can use any OTP generation library)
      const otp = Math.floor(100000 + Math.random() * 900000);

      // Send OTP via Twilio
      await client.messages.create({
        body: `Your OTP for signup is: ${otp}`,
        to: process.env.TWILIO_PERSONAL_NUMBER,
        from: process.env.TWILIO_PHONE_NUMBER,
      });

      // Store signup data in session for verification later
      req.session.otp = otp;
      req.session.signupData = {
        fullname,
        email,
        password,
        phoneNumber,
      };

      console.log("OTP::", req.session.otp);
      // Redirect to verifyOTP page
      res.redirect("/verifyOTP");
    } catch (error) {
      next(error); // Pass the error to the error handling middleware
    }
  },
  googleCallback: async (req, res) => {
    try {
      if (req.session.user) {
        // If session exists, redirect to Home
        return res.redirect("/home");
      }
      const { displayName, id, emails } = req.user;
      const googleEmail = emails && emails.length > 0 ? emails[0].value : null;

      // Check if a user with the same email exists
      let existingUser = await UserAdmin.findOne({ email: googleEmail });

      if (existingUser) {
        // Reload the user data from the database using the _id
        const reloadedUser = await UserAdmin.findById(existingUser._id);

        // Check if the reloaded user is blocked
        if (reloadedUser.isBlocked) {
          // If user is blocked, show appropriate message or redirect to a blocked page
          req.flash(
            "error",
            "Your account has been blocked. Please contact support."
          );
          return res.redirect("/login");
        } else {
          // If user exists and is not blocked, create session and redirect to userHome
          req.session.user = {
            _id: reloadedUser._id,
            email: reloadedUser.email,
            fullname: reloadedUser.fullname,
            // Add any other properties you want to include in the session
          };
          // Flash message
          req.flash("success", "Signed in successfully!");
          // Redirect to userHome or wherever you want after successful authentication
          return res.redirect("/home");
        }
      } else {
        // If user doesn't exist, create a new user in the database
        let fullname = displayName || "Unknown"; // Use a default value if full name is not available
        const newUser = new UserAdmin({
          googleId: id,
          displayName,
          email: googleEmail,
          fullname, // Use the extracted fullname
          // Add any other properties you want to save
        });
        await newUser.save();
        // Create session for the new user
        req.session.user = {
          _id: newUser._id,
          email: newUser.email,
          fullname: newUser.fullname, // Use the newly extracted fullname
          // Add any other properties you want to include in the session
        };
        // Flash message
        req.flash("success", "Signed in successfully!");
        // Redirect to userHome or wherever you want after successful authentication
        return res.redirect("/home");
      }
    } catch (error) {
      console.error("Error handling Google callback:", error);
      // Handle the error appropriately
      req.flash("error", "Failed to sign in. Please try again.");
      res.redirect("/login"); // Redirect to login page in case of error
    }
  },

  renderOTP: (req, res) => {
    // Check if OTP session exists and calculate the remaining time if it does
    const otpSession = req.session.otp;
    let remainingTime = 300; // Set initial remaining time to 5 minutes (300 seconds)
    if (otpSession) {
      const currentTime = new Date().getTime();
      const otpSentTime = req.session.otpSentTime;
      const timeElapsed = currentTime - otpSentTime;
      const expirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds
      remainingTime = Math.max(0, expirationTime - timeElapsed);
    }

    // Pass data to display the timer and the "Didn't receive OTP?" link
    const data = {
      errorMessage: req.flash("error"),
      successMessage: req.flash("success"),
      showResendOTP: true, // Always show the "resendOTP" div
      remainingTime: remainingTime / 1000, // Convert remaining time to seconds
    };
    res.render("user/verifyOTP", data);
  },

  verifyOTP: async (req, res, next) => {
    try {
      const { otp, resendOTP } = req.body;
      const storedOTP = req.session.otp;
      const signupData = req.session.signupData;

      if (resendOTP) {
        // User requested to resend OTP
        const newOTP = Math.floor(100000 + Math.random() * 900000);
        // Send OTP via Twilio
        await client.messages.create({
          body: `Your new OTP for signup is: ${newOTP}`,
          to: process.env.TWILIO_PERSONAL_NUMBER,
          from: process.env.TWILIO_PHONE_NUMBER,
        });
        // Update the stored OTP and OTP sent time
        req.session.otp = newOTP;
        req.session.otpSentTime = new Date().getTime();
        // Display success message for resent OTP
        req.flash("success", "New OTP has been sent to your phone.");
        return res.redirect("/verifyOTP");
      }

      // Check if OTP verification is successful
      if (!signupData || otp.toString() !== storedOTP.toString()) {
        // If OTP verification fails, display error message
        req.flash("error", "Invalid OTP. Please try again.");
        return res.redirect("/verifyOTP");
      } else {
        req.flash("success", "Signup successful! Please login to continue.");
      }

      // OTP is valid, save user data to userAdmin collection
      const hashedPassword = await bcrypt.hash(signupData.password, 10);
      const newUser = new UserAdmin({
        fullname: signupData.fullname,
        email: signupData.email,
        password: hashedPassword,
        phoneNumber: signupData.phoneNumber,
      });
      await newUser.save();

      // Redirect to login page with success message
      res.redirect("/login");
    } catch (error) {
      // Pass the error to the error handling middleware
      next(error);
    }
  },

  renderLogin: (req, res) => {
    // Check if user session exists
    if (!req.session.isAuth) {
      res.render("user/userLogin", {
        errorMessage: req.flash("error"),
        successMessage: req.flash("success"),
        userSession: req.session.user,
      });
    } else {
      // If session exists, redirect to Home
      return res.redirect("/home");
    }
  },

  renderSignup: (req, res) => {
    // Render the signup page
    res.render("user/userSignup", {
      errorMessage: req.flash("error"),
      successMessage: req.flash("success"),
      userSession: req.session.user,
    });
  },
  renderUserHome: (req, res) => {
    // Store check-in and check-out dates in session
    req.session.checkIn = req.body.checkIn;
    req.session.checkOut = req.body.checkOut;

    res.render("user/userHome", {
      errorMessage: req.flash("error"),
      successMessage: req.flash("success"),
      userSession: req.session.user,
      getCurrentDate: getCurrentDate,
      checkIn: req.session.checkIn, // Pass the checkIn variable to the view
      checkOut: req.session.checkOut, // Pass the checkOut variable to the view
    });
  },

  loginPost: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Query the userAdmin collection to find a user with the provided email
      const user = await UserAdmin.findOne({ email });

      if (user) {
        // Check if the user is not blocked
        if (!user.isBlocked) {
          // If a user is found and not blocked, compare the provided password with the hashed password stored in the database
          const passwordMatch = await bcrypt.compare(password, user.password);
          if (passwordMatch) {
            // If the passwords match, create a session for the user
            req.session.isAuth = true;
            req.session.user = {
              _id: user._id,
              email: user.email,
              fullname: user.fullname,
              // Include fullname in session data
            };
            // req.session.admin = null; // Clear any existing admin session
            // req.session.save(); // Save the session to the store
            // Redirect to the user home
            return res.redirect("/home");
          } else {
            // If the passwords don't match, render the login page with an error message
            req.flash("error", "Invalid email or password.");
            return res.redirect("/login");
          }
        } else {
          // If the user is blocked, render the login page with an error message
          req.flash(
            "error",
            "Your account has been blocked. Please contact support."
          );
          return res.redirect("/login");
        }
      } else {
        // If the user doesn't exist, render the login page with an error message
        req.flash("error", "Invalid email or password.");
        return res.redirect("/login");
      }
    } catch (error) {
      // Pass the error to the error handling middleware
      next(error);
    }
  },

  logout: (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        // Handle the error appropriately
        req.flash("error", "Error logging out. Please try again.");
        return res.redirect("/home");
      }
      // Redirect to the login page with logout success message
      req.flash("success", "Logout successful!");
      res.redirect("/login");
    });
  },
  renderLogout: (req, res) => {
    if (!req.session) {
      // If session is not available, simply redirect
      return res.redirect("/login");
    }
    // Render the login page with the logout success message
    res.render("user/userLogin", {
      errorMessage: "",
      successMessage: "Logout successful!",
      userSession: req.session.user,
    });
  },

  searchProperty: async (req, res, next) => {
    try {
      const {
        search,
        category,
        roomFacilities,
        priceRange,
        guest,
        page = 1,
      } = req.query;
      const { checkIn, checkOut } = req.query;

      // Store check-in and check-out dates in session
      req.session.checkIn = checkIn;
      req.session.checkOut = checkOut;

      const propertiesPerPage = 5;

      // Construct the initial search query
      const searchQuery = {};

      // If search term is provided, search by property name or address
      if (search) {
        searchQuery.$or = [
          { propertyName: { $regex: new RegExp(search, "i") } },
          { address: { $regex: new RegExp(search, "i") } },
        ];
      }
      // Fetch properties based on the search query
      const properties = await Property.find(searchQuery)
        .skip((page - 1) * propertiesPerPage)
        .limit(propertiesPerPage);

      // Fetch categories from the database
      const categories = await Category.find(); // Assuming this fetches all categories

      // Calculate total number of properties
      const totalCount = await Property.countDocuments(searchQuery);
      // Calculate total number of pages
      const totalPages = Math.ceil(totalCount / propertiesPerPage);

      // Get today's date
      // const today = new Date().toISOString().split("T")[0];
      console.log("CheckIn:", checkIn);
      console.log("CheckOut:", checkOut);

      // Render the search results
      res.render("user/userSearch", {
        search: search || "", // Ensure that search is properly passed with a default value
        category,
        roomFacilities,
        priceRange,
        checkIn,
        checkOut,
        guest,
        properties,
        categories,
        currentPage: page,
        userSession: req.session.user,
        propertyCount: properties.length,
        totalPages: totalPages,
        // Pass today's date to the template
      });
    } catch (error) {
      next(error);
    }
  },

  // Function to apply filters
  applyFilters: async (req, res, next) => {
    try {
      const {
        search,
        category,
        roomFacilities,
        priceRange,
        checkIn,
        checkOut,
        guest,
        page = 1,
      } = req.query;
      const filter = {};

      // Construct the search query
      const searchQuery = {};
      if (search) {
        searchQuery.$or = [
          { propertyName: { $regex: new RegExp(search, "i") } },
          { address: { $regex: new RegExp(search, "i") } },
        ];
      }

      // Construct the filter object based on the query parameters
      if (category) {
        const selectedCategories = Array.isArray(category)
          ? category
          : [category];
        filter.categoryName = { $in: selectedCategories };
      }
      if (roomFacilities) {
        filter.roomFacilities = { $in: roomFacilities };
      }
      if (priceRange) {
        if (priceRange.includes("-")) {
          const [minPrice, maxPrice] = priceRange.split("-").map(parseFloat);
          if (!isNaN(minPrice) && !isNaN(maxPrice)) {
            filter.price = { $gte: minPrice, $lte: maxPrice };
          } else {
            throw new Error("Invalid price range");
          }
        } else {
          const price = parseFloat(priceRange);
          if (!isNaN(price)) {
            filter.price = { $lte: price };
          } else {
            throw new Error("Invalid price range");
          }
        }
      }

      // Combine the search query and filter query
      const combinedQuery = { ...searchQuery, ...filter };

      // Fetch properties based on the combined query
      const properties = await Property.find(combinedQuery);
      const propertiesPerPage = 5;
      // Fetch categories from the database
      const categories = await Category.find();
      // Calculate total number of properties
      const totalCount = await Property.countDocuments(searchQuery);
      // Calculate total number of pages
      const totalPages = Math.ceil(totalCount / propertiesPerPage);

      // Render the userSearch.ejs view with filtered properties, categories, and other data
      res.render("user/userSearch", {
        search: search || "", // Ensure that search is properly passed with a default value
        category,
        roomFacilities,
        priceRange,
        checkIn,
        checkOut,
        guest,
        properties,
        categories,
        currentPage: page,
        userSession: req.session.user,
        propertyCount: properties.length,
        totalPages: totalPages, // Pass the propertyCount variable
        // Add any other necessary data
      });
    } catch (error) {
      console.error("Error applying filters:", error);
      res.status(500).send(`Error applying filters: ${error.message}`);
    }
  },

  renderPropertyDetails: async (req, res, next) => {
    try {
      const { userSession, search, guest, propertyName, checkIn, checkOut } =
        req.query;

      // Parse check-in and check-out dates
      const parsedCheckIn = checkIn ? new Date(checkIn) : null;
      const parsedCheckOut = checkOut ? new Date(checkOut) : null;

      console.log("parsedCheckIn:", parsedCheckIn);
      console.log("parsedCheckOut:", parsedCheckOut);

      // Check if both check-in and check-out dates are valid
      if (
        !parsedCheckIn ||
        !parsedCheckOut ||
        parsedCheckIn >= parsedCheckOut
      ) {
        throw new Error("Invalid check-in or check-out date.");
      }

      // Decode and trim property name
      const decodedPropertyName = decodeURIComponent(propertyName).trim();

      // Log the decoded property name
      console.log("Decoded Property Name:", decodedPropertyName);

      // Query the database for the property details
      const property = await Property.findOne({
        propertyName: decodedPropertyName,
      }).lean();

      req.session.propbook = {
        property,
        checkIn: parsedCheckIn,
        checkOut: parsedCheckOut,
      };
      console.log("req.session.propbook:", req.session.propbook);

      if (!property) {
        console.log(
          "Property not found in the database for name:",
          decodedPropertyName
        );
        return res.status(404).send("Property not found");
      }

      // Calculate the availability and pricing based on the dates and guest count
      const numberOfNights = Math.ceil(
        (parsedCheckOut - parsedCheckIn) / (1000 * 60 * 60 * 24)
      );
      const totalPrice = property.price * numberOfNights;
      console.log("NoNight:", numberOfNights);
      console.log("PriceOfPro:", property.price);
      console.log("TotalPrice:", totalPrice);

      // Render the property details page
      res.render("user/viewDetails", {
        property,
        checkIn: parsedCheckIn,
        checkOut: parsedCheckOut,
        guest,
        userSession,
        couponMessage: req.flash("couponMessage"),
        search,
        totalPrice,
        numberOfNights,
      });
    } catch (error) {
      next(error);
    }
  },

  renderAndUpdateProfile: async (req, res) => {
    try {
      if (req.session.user) {
        const { _id, email, fullname, phoneNumber } = req.session.user;
        const user = await UserAdmin.findById(_id);
        if (!user) {
          await UserAdmin.create({ _id, email, fullname, phoneNumber });
        }
        res.render("user/userProfile", {
          user: {
            _id,
            email,
            fullname: user ? user.fullname || fullname : fullname,
            phoneNumber: user ? user.phoneNumber || phoneNumber : phoneNumber,
            age: user ? user.age : null,
            gender: user ? user.gender : null,
          },
          errorMessage: req.flash("error"),
          successMessage: req.flash("success"),
          userSession: req.session.user,
        });
      } else {
        req.flash("error", "Please login to view your profile.");
        res.redirect("/login");
      }
    } catch (error) {
      console.error("Error rendering or updating user profile:", error);
      req.flash("error", "An error occurred. Please try again.");
      res.redirect("/profile");
    }
  },

  updateProfile: [
    // Server-side validation rules
    body("fullname").notEmpty().withMessage("Full name is required."),
    body("phoneNumber")
      .matches(/^\d{10}$/)
      .withMessage("Phone number must be 10 digits."),
    body("age").isInt({ gt: 0 }).withMessage("Please enter a valid age."),
    body("gender").notEmpty().withMessage("Please select a gender."),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err) => err.msg);
        req.flash("error", errorMessages);
        return res.redirect("/profile");
      }

      try {
        // Check if user session exists
        if (req.session.user) {
          // Retrieve user data from the session
          const { _id } = req.session.user;

          // Retrieve updated profile information from the request body
          const { fullname, phoneNumber, age, gender, email } = req.body;

          // Retrieve user data from the database
          const user = await UserAdmin.findById(_id);

          // Check if the email can be updated
          if (!user.email) {
            // Check if the new email is unique
            const existingUser = await UserAdmin.findOne({ email });
            if (existingUser && existingUser._id.toString() !== _id) {
              req.flash("error", "Email is already in use.");
              return res.redirect("/profile");
            }
          }

          // Update user information in the database
          const updatedUser = await UserAdmin.findByIdAndUpdate(
            _id,
            {
              fullname,
              phoneNumber,
              age,
              gender,
              ...(user.email ? {} : { email }), // Only update email if it's not already set
            },
            { new: true }
          );

          // Update the session with the new user data
          req.session.user = {
            _id: updatedUser._id,
            email: updatedUser.email,
            fullname: updatedUser.fullname,
            phoneNumber: updatedUser.phoneNumber,
          };

          // Redirect to the profile page with success message
          req.flash("success", "Profile updated successfully.");
          return res.redirect("/profile");
        } else {
          // If user session doesn't exist, redirect to login page
          req.flash("error", "Please login to update your profile.");
          return res.redirect("/login");
        }
      } catch (error) {
        console.error("Error updating user profile:", error);
        req.flash(
          "error",
          "An error occurred while updating your profile. Please try again."
        );
        return res.redirect("/profile");
      }
    },
  ],

  renderChangePassword: (req, res) => {
    res.render("user/changePassword", {
      errorMessage: req.flash("error"),
      successMessage: req.flash("success"),
      userSession: req.session.user,
    });
  },

  changePassword: [
    // Server-side validation rules
    body("newPassword")
      .notEmpty()
      .withMessage("New password is required.")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long.")
      .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
          throw new Error(
            "New password must be different from current password."
          );
        }
        return true;
      }),
    body("confirmPassword")
      .notEmpty()
      .withMessage("Confirm password is required.")
      .custom((value, { req }) => {
        if (!value) {
          // Handle case where confirm password is not provided
          throw new Error("Confirm password is required.");
        }
        if (value !== req.body.newPassword) {
          throw new Error("Passwords do not match.");
        }
        return true;
      }),
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          console.log("Validation Errors:", errors.array());
          const errorMessages = errors.array().map((err) => err.msg);
          req.flash("error", errorMessages);
          return res.redirect("/change-password");
        }

        // Retrieve user data from session
        const { _id } = req.session.user;

        // Retrieve new password from request body
        const { newPassword } = req.body;

        // Retrieve user data from the database
        const user = await UserAdmin.findById(_id);

        // Check if current password exists
        if (user.password) {
          // Retrieve current password from request body
          const { currentPassword } = req.body;

          // Check if current password matches the one stored in the database
          const passwordMatch = await bcrypt.compare(
            currentPassword,
            user.password
          );
          if (!passwordMatch) {
            console.log("Current password is incorrect.");
            req.flash("error", "Current password is incorrect.");
            return res.redirect("/change-password");
          }
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user's password in the database
        await UserAdmin.findByIdAndUpdate(_id, { password: hashedPassword });

        // Redirect to profile page with success message
        req.flash("success", "Password changed successfully.");
        return res.redirect("/profile");
      } catch (error) {
        console.error("Error changing password:", error);
        req.flash(
          "error",
          "An error occurred while changing the password. Please try again."
        );
        return res.redirect("/change-password");
      }
    },
  ],
  renderYourBooking: async (req, res) => {
    try {
      const userId = req.session.user._id;
      const page = parseInt(req.query.page) || 1; // Get the current page from query parameters, default is 1
      const limit = 5; // Number of bookings per page
      const skip = (page - 1) * limit;
  
      // Retrieve bookings for the current user with pagination
      const bookings = await Booking.find({
        user: userId,
      })
      .populate("property")
      .sort({ dateInitiated: -1 }) // Sort by dateInitiated field in descending order (most recent first)
      .skip(skip)
      .limit(limit);
  
      const totalBookings = await Booking.countDocuments({ user: userId });
      const totalPages = Math.ceil(totalBookings / limit);
  
      // Prepare the booking data with necessary properties for the modal
      const bookingsWithModalData = await Promise.all(
        bookings.map(async (booking) => {
          const property = booking.property;
  
          // Extract image URLs from the property
          const imageUrls = property.images.map(
            (image) => `/uploads/properties/${image}`
          );
  
          // Get the coupon name (if any)
          const couponName = booking.couponName ? booking.couponName : "None";
  
          return {
            id: booking._id,
            property: {
              name: property.propertyName,
              imageUrl: imageUrls,
              address: property.address,
              ownerName: property.owner.fullname,
              ownerPhone: property.owner.phoneNumber,
            },
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            price: booking.price,
            bookingStatus: booking.bookingStatus,
            payMethod: booking.payMethod,
            name: booking.name,
            email: booking.email,
            phoneNumber: booking.phoneNumber,
            couponName: couponName, // Add the coupon name to the booking object
          };
        })
      );
  
      // Render the yourBooking.ejs view with the bookings data
      res.render("user/yourBooking", {
        bookings: bookingsWithModalData,
        userSession: req.session.user,
        currentPage: page,
        totalPages: totalPages,
        successMessage: req.flash("success"),
        errorMessage: req.flash("error"),
      });
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      req.flash(
        "error",
        "An error occurred while fetching your bookings. Please try again."
      );
      return res.redirect("/profile");
    }
  },
  
  viewDetails: async (req, res) => {
    try {
      // Retrieve the bookingId from the request query
      const bookingId = req.query.bookingId;

      const bookings = await Booking.find({
        user: req.session.user._id,
      }).populate("property");

      // Prepare the booking data with necessary properties for the modal
      const bookingsWithModalData = await Promise.all(
        bookings.map(async (booking) => {
          const property = booking.property;

          // Extract image URLs from the property
          const imageUrls = property.images.map(
            (image) => `/uploads/properties/${image}`
          );

          return {
            id: booking._id,
            property: {
              name: property.propertyName,
              imageUrl: imageUrls, // Pass image URLs here
              address: property.address,
              ownerName: property.owner.fullname,
              ownerPhone: property.owner.phoneNumber,
            },
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            price: booking.price,
            bookingStatus: booking.bookingStatus,
            payMethod: booking.payMethod,
            name: booking.name,
            email: booking.email,
            phoneNumber: booking.phoneNumber,
          };
        })
      );

      // Fetch the booking details from the database
      const booking = await Booking.findById(bookingId).populate({
        path: "property",
        populate: {
          path: "owner",
        },
      });

      // Check if the booking exists
      if (!booking) {
        req.flash("error", "Booking not found");
      }

      // Extract propertyId from the booking

      const propertyId = booking.property;
      // Query the property details using the propertyId
      const property = await Property.findById(propertyId);

      // Check if the property exists
      if (!property) {
        req.flash("error", "Property not found");
      }

      // Log the property object to verify the structure and image URLs
      console.log("Property:", property);

      // Pass booking and property details to the EJS template
      res.render("user/viewDetailsBooking", {
        bookings: bookingsWithModalData,
        userSession: req.session.user,
        booking,
        property,
        bookingId: bookingId,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  },

  cancelBooking: async (req, res) => {
    try {
      // Retrieve the bookingId from the request body
      const bookingId = req.body.bookingId;

      // Find the booking with the provided bookingId
      const booking = await Booking.findById(bookingId);

      // Check if the booking exists
      if (!booking) {
        // If the booking does not exist, render an error page or handle it appropriately
        req.flash("error", "Booking not found.");
        return res.redirect("/yourBooking");
      }

      // Update the booking status to "Cancelled"
      booking.bookingStatus = "Cancelled";
      await booking.save();

      // Flash success message
      req.flash("success", "Booking canceled successfully.");

      // Redirect back to the dashboard
      res.redirect("/yourBooking");
    } catch (err) {
      // If an error occurs during the process, handle it appropriately
      console.error(err);
      req.flash("error", "An error occurred while canceling booking.");
      res.redirect("/yourBooking");
    }
  },
  displayPaymentPage: async (req, res, next) => {
    try {
      // Check if the user is logged in
      if (!req.session.user) {
        req.flash("error", "You must be logged in to view the payment page.");
        return res.redirect("/login");
      }
      const userSession = req.session.user;
      console.log("User : userID", req.session.user, req.session.user._id);
      console.log("UserSession : ", userSession);
      // Function to get current date
      const getCurrentDate = () => {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, "0");
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const yyyy = today.getFullYear();
        return yyyy + "-" + mm + "-" + dd;
      };

      // Destructuring request query parameters
      const {
        propertyName,
        propertyPrice,
        checkInDate,
        checkOutDate,
        paymentMethod,
        orderId,
        totalPrice,
      } = req.query;
      console.log("REQ.QUERY :", req.query);
      // Fetch the propertyId based on the propertyName
      // Decode and trim property name
      const decodedPropertyName = decodeURIComponent(propertyName).trim();

      // Log the decoded property name
      console.log("Decoded Property Name:", decodedPropertyName);

      // Query the database for the property details
      const property = await Property.findOne({
        propertyName: decodedPropertyName,
      }).lean();

      req.session.propbook = {
        property,
      };
      console.log("req.session.propbook:", req.session.propbook);

      // Rendering the payment page and passing necessary data
      res.render("user/payment", {
        propertyName: decodeURIComponent(propertyName),
        propertyPrice: decodeURIComponent(propertyPrice),
        property,
        checkInDate: decodeURIComponent(checkInDate),
        checkOutDate: decodeURIComponent(checkOutDate),
        totalPrice: decodeURIComponent(totalPrice),
        userSession: req.session.user,
        currentDate: getCurrentDate(),
        paymentMethod: paymentMethod,
        messages: req.flash(),
        orderId: orderId,
        property,
      });
      res.locals.userSession = req.session.user;
    } catch (error) {
      console.error("Error displaying payment page:", error);
      res.status(500).send("Error displaying payment page.");
    }
  },
  applyCoupon: async (req, res) => {
    try {
      const { couponCode, propertyName, paymentMethod, totalPrice } = req.body;
      const userId = req.session.user._id;
      console.log("COUPON BODY : ", req.body);
      console.log("ID : ", userId);

      const coupon = await Coupon.findOne({ code: couponCode }).populate(
        "category"
      );
      if (!coupon) {
        const errorMessage = "Invalid coupon code.";
        req.flash("error", errorMessage);
        return res.status(404).json({ success: false, message: errorMessage });
      }

      const property = await Property.findOne({ propertyName });
      if (!property || coupon.category.name !== property.categoryName) {
        const errorMessage =
          "Coupon is not applicable for this property category.";
        req.flash("error", errorMessage);
        return res.status(400).json({ success: false, message: errorMessage });
      }

      if (coupon.expirationDate < new Date()) {
        const errorMessage = "Coupon has expired.";
        req.flash("error", errorMessage);
        return res.status(400).json({ success: false, message: errorMessage });
      }

      if (coupon.payMethod && coupon.payMethod !== paymentMethod) {
        const errorMessage = `Coupon is only valid for ${coupon.payMethod} payments.`;
        req.flash("error", errorMessage);
        return res.status(400).json({ success: false, message: errorMessage });
      }

      const user = await UserAdmin.findById(userId);
      if (user.usedCoupons.includes(coupon._id)) {
        const errorMessage = "You have already used this coupon.";
        req.flash("error", errorMessage);
        return res.status(400).json({ success: false, message: errorMessage });
      }

      // Apply the discount
      const newPrice = totalPrice - coupon.fixedValue;

      const successMessage = `Coupon applied successfully! You saved ₹${coupon.fixedValue}.`;
      req.flash("success", successMessage);
      return res.json({ success: true, newPrice, message: successMessage });
    } catch (error) {
      console.error("Error applying coupon:", error);
      const errorMessage = "An error occurred while applying the coupon.";
      req.flash("error", errorMessage);
      res.status(500).json({ success: false, message: errorMessage });
    }
  },

  bookProperty: async (req, res, next) => {
    const {
      propertyName,
      checkInDate,
      checkOutDate,
      totalPrice,
      name,
      email,
      phoneNumber,
      paymentMethod,
      couponCode,
    } = req.body;

    try {
      if (paymentMethod !== "PayAtProperty") {
        req.flash("error", "The payment method is not Pay at property");
        return res.redirect("/payment");
      }

      let discount = 0;

      if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode }).populate(
          "category"
        );
        if (!coupon) {
          req.flash("error", "Invalid coupon code.");
          return res.redirect("/payment");
        }

        const property = await Property.findOne({ propertyName });
        if (!property) {
          req.flash("error", "Property not found.");
          return res.redirect("/payment");
        }

        if (coupon.category.name !== property.categoryName) {
          req.flash(
            "error",
            "Coupon is not applicable for this property category."
          );
          return res.redirect("/payment");
        }

        if (coupon.expirationDate < new Date()) {
          req.flash("error", "Coupon has expired.");
          return res.redirect("/payment");
        }

        if (coupon.payMethod && coupon.payMethod !== paymentMethod) {
          req.flash(
            "error",
            `Coupon is only valid for ${coupon.payMethod} payments.`
          );
          return res.redirect("/payment");
        }

        discount = coupon.fixedValue;
      }

      const property = await Property.findOne({ propertyName });
      if (!property) {
        req.flash("error", "Property not found.");
        return res.redirect("/payment");
      }

      const propertyId = property._id;
      const finalPrice = parseFloat(totalPrice) - discount;

      const newBooking = new Booking({
        property: propertyId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        user: req.session.user._id,
        price: finalPrice,
        name,
        email,
        phoneNumber,
        bookingStatus: "Confirmed",
        payMethod: "PayAtProperty",
        couponName: couponCode,
        dateInitiated: new Date(),
      });
      // Update user coupon usage
      const userId = req.session.user._id;
      const user = await UserAdmin.findById(userId);
      const coupon = await Coupon.findOne({ code: couponName });
      if (coupon) {
        user.usedCoupons.push(coupon._id);
      }

      await user.save();

      await newBooking.save();
      return res.redirect("/yourBooking");
    } catch (error) {
      console.error("Error booking property:", error);
      req.flash("error", "Error booking property.");
      return res.redirect("/payment");
    }
  },

  createOrder: async (req, res) => {
    try {
      const {
        totalPrice,
        checkIn,
        checkOut,
        payMethod,
        propertyId,
        name,
        email,
        phoneNumber,
        couponName,
      } = req.body;

      console.log("BODY REQ:", req.body);

      if (!propertyId) {
        console.error("Property not specified.");
        return res.status(400).json({
          success: false,
          error: "Property not specified.",
        });
      }

      const propertyDetails = await Property.findById(propertyId);
      if (!propertyDetails) {
        console.error("Property not found.");
        return res.status(404).json({
          success: false,
          error: "Property not found.",
        });
      }
      if (!isValidObjectId(propertyId)) {
        console.error("Invalid ObjectId for property:", propertyId);
        return res.status(400).json({
          success: false,
          error: "Invalid property ID.",
        });
      }

      let finalPrice = totalPrice;

      if (couponName) {
        try {
          const coupon = await Coupon.findOne({ code: couponName }).populate(
            "category"
          );
          if (!coupon) {
            throw new Error("Invalid coupon code.");
          }

          const property = await Property.findOne({ _id: propertyId });
          if (!property || coupon.category.name !== property.categoryName) {
            throw new Error(
              "Coupon is not applicable for this property category."
            );
          }

          if (coupon.expirationDate < new Date()) {
            throw new Error("Coupon has expired.");
          }

          if (coupon.payMethod && coupon.payMethod !== payMethod) {
            throw new Error(
              `Coupon is only valid for ${coupon.payMethod} payments.`
            );
          }

          finalPrice = totalPrice - coupon.fixedValue;
        } catch (error) {
          console.error("Invalid coupon:", error.message);
          return res.status(400).json({
            success: false,
            error: error.message,
          });
        }
      }

      const options = {
        amount: finalPrice * 100, // Amount in smallest currency unit (paise)
        currency: "INR",
        receipt: "receipt#1",
        payment_capture: 1, // Auto capture payment after successful payment
      };

      const order = await razorpayInstance.orders.create(options);

      const newBooking = new Booking({
        property: propertyId,
        checkIn,
        checkOut,
        user: req.session.user._id,
        price: finalPrice,
        payMethod,
        name,
        propertyId,
        email,
        phoneNumber,
        couponName,
        dateInitiated: new Date(),
      });
      console.log("Booking :", newBooking);
      const userId = req.session.user._id;
      const user = await UserAdmin.findById(userId);
      const coupon = await Coupon.findOne({ code: couponName });
      if (coupon) {
        user.usedCoupons.push(coupon._id);
      }

      await user.save();
      await newBooking.save();

      res.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
      });
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({
        success: false,
        error: "Error creating order.",
      });
    }
  },
};

module.exports = userController;
