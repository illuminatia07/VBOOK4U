const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  expirationDate: {
    type: Date,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  fixedValue: {
    type: Number,
    required: true,
  },
  payMethod: {
    type: String,
    enum: ["Online", "PayAtProperty"],
    required: true,
  },
});

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
