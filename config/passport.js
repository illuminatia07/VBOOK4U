const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const UserAdmin = require("../models/userAdmin");
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Check if user email exists in the profile
        if (!profile.emails || profile.emails.length === 0) {
          return done(new Error("User email not provided by Google."));
        }

        // Extract the first email from the profile
        const userEmail = profile.emails[0].value;

        // Check if user exists in the database
        let user = await UserAdmin.findOne({ email: userEmail });

        if (!user) {
          // If user doesn't exist, create a new user in the database
          // Handle case where fullname is not available in the profile
          const fullname = profile.displayName || "Unknown";

          user = new UserAdmin({
            googleId: profile.id,
            displayName: profile.displayName,
            fullname: fullname,
            email: userEmail,
            // Other fields remain the same
          });
          await user.save();
        }

        // Return user data
        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserAdmin.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
