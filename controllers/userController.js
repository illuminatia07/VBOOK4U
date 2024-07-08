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
        return res.redirect("/home");
      }
  
      const { displayName, id, emails, phone } = req.user;
      const googleEmail = emails && emails.length > 0 ? emails[0].value : null;
  
      if (!googleEmail) {
        req.flash("error", "Google authentication failed: email not provided.");
        return res.redirect("/login");
      }
  
      let existingUser = await UserAdmin.findOne({ email: googleEmail });
  
      if (existingUser) {
        const reloadedUser = await UserAdmin.findById(existingUser._id);
  
        if (reloadedUser.isBlocked) {
          req.flash("error", "Your account has been blocked. Please contact support.");
          return res.redirect("/login");
        } else {
          req.session.user = {
            _id: reloadedUser._id,
            email: reloadedUser.email,
            fullname: reloadedUser.fullname,
            phone: reloadedUser.phone || null,
            googleId: id,
            googleuser: true,
            // Add any other properties you want to include in the session
          };
          console.log("Function worked");
          req.flash("success", "Signed in successfully!");
          return res.redirect("/home");
        }
      } else {
        let fullname = displayName || "Unknown";
        const newUser = new UserAdmin({
          googleId: id,
          fullname,
          email: googleEmail,
          phone: phone || null,
          googleuser: true,
          // Add any other properties you want to save
        });
        console.log("Google User", newUser);
        await newUser.save();
        req.session.user = {
          _id: newUser._id,
          email: newUser.email,
          fullname: newUser.fullname,
          phone: newUser.phone || null,
          googleId: id,
          googleuser: true,
          // Add any other properties you want to include in the session
        };
        console.log("Session of google user ", req.session.user);
        req.flash("success", "Signed in successfully!");
        return res.redirect("/home");
      }
    } catch (error) {
      console.error("Error handling Google callback:", error);
      req.flash("error", "Failed to sign in. Please try again.");
      res.redirect("/login");
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
      console.log("Search : ", req.query);
      const { checkIn, checkOut } = req.query;

      // Store check-in and check-out dates in session
      req.session.checkIn = checkIn;
      req.session.checkOut = checkOut;

      const propertiesPerPage = 4;

      // Construct the initial search query
      const searchQuery = {};

      // If search term is provided, search by property name or address
      if (search) {
        searchQuery.$or = [
          {
            $and: [
              { propertyName: { $regex: new RegExp(search, "i") } },
              { availability: true },
            ],
          },
          {
            $and: [
              { address: { $regex: new RegExp(search, "i") } },
              { availability: true },
            ],
          },
        ];
      } else {
        searchQuery.availability = true;
      }
      console.log("SEARCH QUERY : ", searchQuery);

      // Fetch properties based on the search query
      const properties = await Property.find(searchQuery)
        .skip((page - 1) * propertiesPerPage)
        .limit(propertiesPerPage);
      console.log("SEARCH QUERY PTS: ", properties);

      // Store properties in session
      req.session.properties = properties;

      // Fetch categories from the database
      const categories = await Category.find(); // Assuming this fetches all categories

      // Calculate total number of properties
      const totalCount = await Property.countDocuments(searchQuery);
      // Calculate total number of pages
      const totalPages = Math.ceil(totalCount / propertiesPerPage);

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
      });
    } catch (error) {
      next(error);
    }
  },

  applyFilters: async (req, res, next) => {
    try {
      const {
        category,
        roomFacilities,
        priceRange,
        search,
        page = 1,
      } = req.query;
      const { checkIn, checkOut } = req.query;

      // Store check-in and check-out dates in session
      req.session.checkIn = checkIn;
      req.session.checkOut = checkOut;

      // Retrieve properties from session
      const properties = req.session.properties || [];
      const categories = await Category.find();

      // Construct the filter object based on the query parameters
      let filteredProperties = properties;

      if (category) {
        const selectedCategories = Array.isArray(category)
          ? category
          : [category];
        filteredProperties = filteredProperties.filter((property) =>
          selectedCategories.includes(property.categoryName)
        );
        console.log(
          "FilteredProp and SelectedCats :",
          filteredProperties,
          selectedCategories
        );
      }

      if (roomFacilities) {
        filteredProperties = filteredProperties.filter((property) =>
          property.roomFacilities.some((facility) =>
            roomFacilities.includes(facility)
          )
        );
        console.log("RoomFacility :", filteredProperties);
      }

      if (priceRange) {
        if (priceRange.includes("-")) {
          const [minPrice, maxPrice] = priceRange.split("-").map(parseFloat);
          if (!isNaN(minPrice) && !isNaN(maxPrice)) {
            filteredProperties = filteredProperties.filter(
              (property) =>
                property.price >= minPrice && property.price <= maxPrice
            );
          } else {
            throw new Error("Invalid price range");
          }
        } else {
          const price = parseFloat(priceRange);
          if (!isNaN(price)) {
            filteredProperties = filteredProperties.filter(
              (property) => property.price <= price
            );
          } else {
            throw new Error("Invalid price range");
          }
        }
        console.log("PriceRange :", filteredProperties);
      }

      // Calculate total number of pages
      const propertiesPerPage = 4;
      const totalCount = filteredProperties.length;
      const totalPages = Math.ceil(totalCount / propertiesPerPage);

      // Render the userSearch.ejs view with filtered properties
      res.render("user/userSearch", {
        category,
        roomFacilities,
        search: search || "",
        priceRange,
        properties: filteredProperties,
        categories,
        checkIn,
        checkOut,
        currentPage: page,
        propertyCount: filteredProperties.length,
        totalPages: totalPages,
        userSession: req.session.user,
      });
    } catch (error) {
      console.error("Error applying filters:", error);
      res.status(500).send(`Error applying filters: ${error.message}`);
    }
  },

  renderPropertyDetails: async (req, res, next) => {
  try {
    const { userSession, search, guest, propertyName, checkIn, checkOut } = req.query;

    const parsedCheckIn = new Date(checkIn);
    const parsedCheckOut = new Date(checkOut);
    req.session.BookIn = true;

    if (!parsedCheckIn || !parsedCheckOut || parsedCheckIn >= parsedCheckOut) {
      throw new Error("Invalid check-in or check-out date.");
    }

    const decodedPropertyName = decodeURIComponent(propertyName).trim();
    const property = await Property.findOne({ propertyName: decodedPropertyName }).lean();

    if (!property) {
      return res.status(404).send("Property not found");
    }

    const numberOfNights = Math.ceil((parsedCheckOut - parsedCheckIn) / (1000 * 60 * 60 * 24));
    const totalPrice = property.price * numberOfNights;

    req.session.bookingDetails = {
      propertyId: property._id,
      propertyName: property.propertyName,
      propertyPrice: property.price,
      checkInDate: parsedCheckIn,
      checkOutDate: parsedCheckOut,
      totalPrice: totalPrice,
    };

    res.render("user/viewDetails", {
      property,
      checkIn: parsedCheckIn,
      checkOut: parsedCheckOut,
      guest,
      userSession: req.session.user, // Pass the user session correctly
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
        .populate('property')
        .sort({ dateInitiated: -1 }) // Sort by dateInitiated field in descending order (most recent first)
        .skip(skip)
        .limit(limit);
  
      const totalBookings = await Booking.countDocuments({ user: userId });
      const totalPages = Math.ceil(totalBookings / limit);
  
      // Prepare the booking data with necessary properties for the view
      const bookingsWithModalData = bookings.map((booking) => {
        if (!booking.property) {
          console.warn(`Booking ID ${booking._id} does not have a linked property.`);
          return {
            id: booking._id,
            property: {
              name: 'N/A',
              imageUrl: [],
              address: 'N/A',
              ownerName: 'N/A',
              ownerPhone: 'N/A',
            },
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            price: booking.price,
            bookingStatus: booking.bookingStatus,
            payMethod: booking.payMethod,
            name: booking.name,
            email: booking.email,
            phoneNumber: booking.phoneNumber,
            couponName: booking.couponName || 'None',
            dateInitiated: booking.dateInitiated, // Include date initiated for time comparison
          };
        }
  
        return {
          id: booking._id,
          property: {
            name: booking.property.propertyName,
            imageUrl: booking.property.images.map(image => `/uploads/properties/${image}`),
            address: booking.property.address,
            ownerName: booking.property.owner.fullname,
            ownerPhone: booking.property.owner.phoneNumber,
          },
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          price: booking.price,
          bookingStatus: booking.bookingStatus,
          payMethod: booking.payMethod,
          name: booking.name,
          email: booking.email,
          phoneNumber: booking.phoneNumber,
          couponName: booking.couponName || 'None',
          dateInitiated: booking.dateInitiated, // Include date initiated for time comparison
        };
      });
  
      // Update booking status to "Failed" if 5 minutes have passed and booking is still "Pending"
      const currentTime = new Date();
      await Promise.all(bookings.map(async (booking) => {
        if ((booking.bookingStatus === 'Pending' || booking.bookingStatus === 'Failed') &&
            (currentTime - new Date(booking.dateInitiated) > 300000)) {
          await Booking.findByIdAndUpdate(booking._id, { bookingStatus: 'Failed' });
        }
      }));
  
      // Render the yourBooking.ejs view with the bookings data
      res.render('user/yourBooking', {
        bookings: bookingsWithModalData,
        userSession: req.session.user,
        currentPage: page,
        totalPages: totalPages,
        successMessage: req.flash('success'),
        errorMessage: req.flash('error'),
      });
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      req.flash('error', 'An error occurred while fetching your bookings. Please try again.');
      res.redirect('/profile');
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
  storePaymentDetails: (req, res, next) => {
    try {
      console.log("Request Body:", req.body); // Log the request body to ensure data is being received

      const {
        propertyId,
        propertyName,
        propertyPrice,
        checkInDate,
        checkOutDate,
        totalPrice,
      } = req.body;

      // Store details in the session
      req.session.paymentDetails = {
        propertyId,
        propertyName,
        propertyPrice,
        checkInDate,
        checkOutDate,
        totalPrice,
      };
      console.log("Stored details in session:", req.session.paymentDetails);

      // Redirect to the payment page
      res.redirect("/payment");
    } catch (error) {
      next(error);
    }
  },

  displayPaymentPage: async (req, res, next) => {
    try {
      if (!req.session.user) {
        req.flash("error", "You must be logged in to view the payment page.");
        return res.redirect("/login");
      }
      if (!req.session.BookIn) {
        return res.redirect("/home");
      }
      const userSession = req.session.user;
  
      const paymentDetails = req.session.paymentDetails;
  
      if (!paymentDetails) {
        req.flash("error", "No payment details found. Please try again.");
        return res.redirect("/viewDetails"); // or any relevant page
      }
  
      const {
        propertyId,
        propertyName,
        propertyPrice,
        checkInDate,
        checkOutDate,
        totalPrice,
      } = paymentDetails;
      console.log("Property ID:", propertyId);
      console.log("Property Name:", propertyName);
  
      // Convert date strings to Date objects
      const parsedCheckInDate = new Date(checkInDate);
      const parsedCheckOutDate = new Date(checkOutDate);
  
      // Check if parsed dates are valid
      if (isNaN(parsedCheckInDate) || isNaN(parsedCheckOutDate)) {
        throw new Error("Invalid check-in or check-out date.");
      }
  
      // Find the property by ID instead of property name
      const property = await Property.findOne({ _id: propertyId }).lean();
  
      if (!property) {
        console.error("Property not found for ID:", propertyId);
        return res.status(404).send("Property not found.");
      }
  
      res.render("user/payment", {
        propertyName: property.propertyName,
        propertyPrice: propertyPrice,
        property,
        checkInDate: parsedCheckInDate.toISOString().split("T")[0],
        checkOutDate: parsedCheckOutDate.toISOString().split("T")[0],
        totalPrice: totalPrice,
        userSession,
        currentDate: new Date().toISOString().split("T")[0],
        messages: req.flash(),
      });
    } catch (error) {
      console.error("Error displaying payment page:", error);
      res.status(500).send("Error displaying payment page.");
    }
  },
  applyCoupon: async (req, res) => {
    try {
      const { couponCode, propertyName, propertyId, paymentMethod, totalPrice } = req.body;
      const userId = req.session.user._id;
  
      // Log the request body to ensure all data is being received correctly
      console.log("Request Body:", req.body);
  
      // Fetch the user and populate used coupons
      const user = await UserAdmin.findById(userId).populate("usedCoupons");
      if (!user) {
        console.error("User not found with ID:", userId);
        return res.status(400).json({
          success: false,
          message: "User not found.",
        });
      }
      console.log("User found:", user);
  
      // Fetch the property details using the propertyId
      const property = await Property.findById(propertyId);
      if (!property) {
        console.error("Property not found for ID:", propertyId);
        return res.status(400).json({
          success: false,
          message: "Property not found.",
        });
      }
      console.log("Property found:", property);
  
      // Check if the user has already used the coupon
      const isCouponUsed = user.usedCoupons.some(coupon => coupon.code === couponCode);
      if (isCouponUsed) {
        console.log("Coupon already used:", couponCode);
        return res.status(400).json({
          success: false,
          message: "You have already used this coupon.",
        });
      }
  
      // Fetch the coupon details
      const coupon = await Coupon.findOne({ code: couponCode }).populate("category");
      if (!coupon) {
        console.error("Invalid coupon code:", couponCode);
        return res.status(400).json({
          success: false,
          message: "Invalid coupon code.",
        });
      }
      console.log("Coupon found:", coupon);
  
      // Check if the coupon is applicable for the property's category
      if (coupon.category && property.category && coupon.category.name !== property.category.name) {
        console.log("Coupon not valid for property category:", coupon.category.name, property.category.name);
        return res.status(400).json({
          success: false,
          message: "This coupon is not valid for the selected property.",
        });
      }
  
      // Calculate the new price after applying the coupon
      let discountAmount = coupon.fixedValue;
      let newPrice = totalPrice - discountAmount;
  
      console.log("Coupon applied successfully. New Price:", newPrice);
  
      return res.json({
        success: true,
        message: "Coupon applied successfully.",
        newPrice: newPrice.toFixed(2),
      });
    } catch (error) {
      console.error("Error applying coupon:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while applying the coupon.",
      });
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
      let coupon = null; // Initialize coupon variable

      if (couponCode) {
        coupon = await Coupon.findOne({ code: couponCode }).populate(
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
      req.session.BookIn=false;
      // Update user coupon usage
      const userId = req.session.user._id;
      const user = await UserAdmin.findById(userId);
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
      req.session.paymentDet = {
        totalPrice,
        checkIn,
        checkOut,
        payMethod,
        propertyId,
        name,
        email,
        phoneNumber,
        couponName
      };

      if (!propertyId || !isValidObjectId(propertyId)) {
        console.error("Invalid property ID:", propertyId);
        return res.status(400).json({
          success: false,
          error: "Invalid property ID.",
        });
      }

      const propertyDetails = await Property.findById(propertyId);
      if (!propertyDetails) {
        console.error("Property not found:", propertyId);
        return res.status(404).json({
          success: false,
          error: "Property not found.",
        });
      }

      let finalPrice = parseFloat(totalPrice); // Convert totalPrice to float

      const amountInPaise = finalPrice; // Convert to paise
      console.log("AMTinPaise :",amountInPaise);
      const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: "receipt#1",
        payment_capture: 1,
      };
      console.log("Options :",options);

      const order = await razorpayInstance.orders.create(options);
      return res.json(order);
    } catch (error) {
      console.error("Error creating order:", error.message);
      return res.status(500).json({
        success: false,
        error: "An error occurred while creating the order.",
      });
    }
  },

  applyCoupon: async (req, res) => {
    try {
      const { couponCode, propertyName, paymentMethod, totalPrice } = req.body;
      const userId = req.session.user._id;

      const user = await UserAdmin.findById(userId).populate("usedCoupons");

      const isCouponUsed = user.usedCoupons.some(coupon => coupon.code === couponCode);

      if (isCouponUsed) {
        return res.status(400).json({
          success: false,
          message: "You have already used this coupon.",
        });
      }

      const coupon = await Coupon.findOne({ code: couponCode }).populate("category");
      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: "Invalid coupon code.",
        });
      }
      const categoryName = coupon.category ? coupon.category.name : null;
    
    // Example check for categoryName if necessary
    if (categoryName && categoryName !== property.categoryName) {
      return res.status(400).json({
        success: false,
        message: "This coupon is not valid for the selected property.",
      });
    }

      const discountAmount = parseFloat(coupon.fixedValue);
      const newPrice = parseFloat(totalPrice) - discountAmount;

      if (isNaN(newPrice)) {
        return res.status(400).json({
          success: false,
          message: "Invalid discount amount or total price.",
        });
      }

      return res.json({
        success: true,
        message: "Coupon applied successfully.",
        newPrice: parseFloat(newPrice.toFixed(2))
      });
    } catch (error) {
      console.error("Error applying coupon:", error.message);
      return res.status(500).json({
        success: false,
        message: "An error occurred while applying the coupon.",
      });
    }
  },
  

  renderPaymentSuccessPage: async (req, res, next) => {
    try {

      if(!req.session.BookIn){
        return res.redirect("/home");
      }
      // Ensure session data exists
      const bookSession = req.session.paymentDet;
      if (!bookSession) {
        return res.status(400).send('Session data not found');
      }
      req.session.BookIn=false;
      // Create a new booking
      const newBooking = new Booking({
        property: bookSession.propertyId,
        checkIn: bookSession.checkIn,
        checkOut: bookSession.checkOut,
        user: req.session.user._id,
        price: bookSession.totalPrice / 100, // Assuming totalPrice is in paise
        payMethod: bookSession.payMethod,
        name: bookSession.name,
        email: bookSession.email,
        phoneNumber: bookSession.phoneNumber,
        couponName: bookSession.couponName,
        dateInitiated: new Date(),
      });
      
      

      // Save booking and update user's used coupons if applicable
      const userId = req.session.user._id;
      const user = await UserAdmin.findById(userId);
      const coupon = await Coupon.findOne({ code: bookSession.couponName });
      if (coupon) {
        user.usedCoupons.push(coupon._id);
      }
  
      await user.save();
      await newBooking.save();
      const property = await Property.findById(bookSession.propertyId);
  
      // Store booking ID in session
      req.session.bookingId = newBooking._id;
  
      // Render the payment success page
      res.render('user/paymentSuccess', {
        userSession: req.session.user,
        booking: newBooking,
        property,
      });
  
      // Optionally, clear the session data if not needed anymore
      req.session.paymentDet = null;
    } catch (error) {
      next(error);
    }
  },
  
  
  renderPaymentPendingPage : (req, res, next) => {
    res.render('user/paymentPending', {
      userSession: req.session.user,
    });
  },
  
  renderPaymentFailedPage : async (req, res, next) => {
    try {
      const userSession = req.session.user;
      
      const paymentDetails = req.session.paymentDet; // Get payment details from session
     
  
      // Store booking ID in session
     
      // Create a new booking with status 'Pending'
      const newBooking = new Booking({
        user: userSession._id,
        propertyId: paymentDetails.propertyId,
        checkIn: paymentDetails.checkIn, // Assuming checkIn and checkOut are already strings
        checkOut: paymentDetails.checkOut,
        price: paymentDetails.totalPrice/100,
        couponCode: paymentDetails.couponName,
        payMethod: paymentDetails.payMethod,
        name: paymentDetails.name,
        email: paymentDetails.email,
        phoneNumber: paymentDetails.phoneNumber,
        bookingStatus: 'Pending'
      });
        console.log("Failed page:",newBooking);
      await newBooking.save();
      req.session.bookingId = newBooking._id;
  
      // Set booking status to 'Failed' after 10 minutes
      setTimeout(async () => {
        await Booking.updateOne(
          { _id: newBooking._id },
          { bookingStatus: 'Failed' }
        );
      }, 10 * 60 * 1000);
  
      res.render('user/paymentFailed', {
        userSession,
        booking: newBooking // Ensure checkIn and checkOut are passed as strings
      });
    } catch (error) {
      next(error);
    }
  },
  
  renderRetryPaymentPage: async (req, res, next) => {
    try {
      const bookingId = req.query.bookingId;
      const booking = await Booking.findById(bookingId).populate('property').lean();
  
      if (!booking) {
        return res.status(404).send("Booking not found");
      }
  
      if (!booking.property || !booking.property.images) {
        return res.status(404).send("Property images not found");
      }
  
      res.render('user/retryPayment', {
        userSession: req.session.user,
        booking: {
          ...booking,
          // Ensure checkIn and checkOut are passed as strings
          checkIn: booking.checkIn,
          checkOut: booking.checkOut
        },
        property: booking.property,
      });
    } catch (error) {
      next(error);
    }
  },
  
  
  retryPayment: async (req, res, next) => {
    try {
      const { bookingId } = req.body;
      const booking = await Booking.findById(bookingId);
  
      if (!booking) {
        return res.status(404).json({ success: false, error: "Booking not found" });
      }
  
      // Create new Razorpay order
      const amount = booking.price * 100; // Convert to paise
      const options = {
        amount: amount,
        currency: "INR",
        receipt: `receipt_${booking._id}`,
      };
  
      const order = await razorpay.orders.create(options);
  
      res.json({
        success: true,
        amount: amount,
        orderId: order.id,
        name: booking.name,
        email: booking.email,
        phoneNumber: booking.phoneNumber,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
};

module.exports = userController;
