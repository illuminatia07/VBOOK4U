const mongoose = require('mongoose');

// Define the schema for the Category model
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        
        type: String,
        required: true
    },
    normalizedName: { type: String, required: true, unique: true }
});

// Create and export the Category model
module.exports = mongoose.model('Category', categorySchema);
