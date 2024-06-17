const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  propertyName: { type: String, required: true },
  categoryName: { type: String, required: true },
  roomFacilities: [{ type: String }],
  description: { type: String, required: true },
  address: { type: String, required: true },
  images: [{ type: String }],
  price: { type: Number, required: true },
  availability: { type: Boolean, default: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
  approvalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
});

const Property = mongoose.model('Property', propertySchema);

module.exports = Property;
 