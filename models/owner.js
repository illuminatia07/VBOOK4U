const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  profilePicture: { type: String }, // New field for storing the profile picture path or URL
  isBlocked: { type: Boolean, default: false } // New attribute to represent whether the owner is blocked or not
});

const Owner = mongoose.model('Owner', ownerSchema);

module.exports = Owner;
