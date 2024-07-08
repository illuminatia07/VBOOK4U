const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property'
    },
  checkIn: {
    type: String,
    required: true,
  },
  checkOut: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserAdmin",
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  bookingStatus: {
    type: String,
    enum: ["Pending", "Confirmed", "Cancelled", "Success", "Failed"],
    default: "Confirmed",
  },
  payMethod: {
    type: String,
    enum: ["Online", "PayAtProperty"],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  couponName: {
    type: String,
    default: null,
  },
  dateInitiated: {
    type: Date,
    default: Date.now,
  },
});

bookingSchema.methods.updateBookingStatus = async function(newStatus) {
  this.bookingStatus = newStatus;
  await this.save();
};

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
