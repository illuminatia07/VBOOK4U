const mongoose = require("mongoose");

const userAdminSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: false },
    email: { type: String, required: false, unique: true },
    password: { type: String, required: false, minlength: 6, maxlength: 16 },
    phoneNumber: { type: String, required: false },
    age: { type: Number, required: false }, // Add the age field
    gender: { type: String, required: false }, // Add the gender field
    isAdmin: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false }, 
    isMember: { type: Boolean, default: false },  
  },
  { timestamps: true }
);

const UserAdmin = mongoose.model("UserAdmin", userAdminSchema, "userAdmin");

module.exports = UserAdmin;
