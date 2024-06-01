// scripts/normalizeCategories.js
const mongoose = require('mongoose');
const Category = require('../models/category'); // Adjust the path to your Category model

mongoose.connect('mongodb://localhost:27017/vbook4u')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function normalizeExistingCategories() {
  try {
    const categories = await Category.find();

    for (let category of categories) {
      const normalizedName = category.name.toLowerCase().replace(/\s+/g, "");
      category.normalizedName = normalizedName;
      await category.save();
    }

    console.log('All categories have been normalized.');
  } catch (err) {
    console.error('Error normalizing categories:', err);
  } finally {
    mongoose.connection.close();
  }
}

normalizeExistingCategories();
