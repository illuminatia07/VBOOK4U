// database.js
const mongoose = require('mongoose');


// MongoDB connection string
const mongoURI = 'mongodb://localhost:27017/vbook4u';

// Connect to MongoDB
mongoose.connect(mongoURI, {
  autoIndex: true
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const db = mongoose.connection;

// More detailed logging for connection events
db.on('connecting', () => console.log('Connecting to MongoDB...'));
db.on('connected', () => console.log('Connected to MongoDB!'));
db.on('open', () => console.log('MongoDB connection opened!'));
db.on('disconnected', () => console.log('MongoDB disconnected!'));
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

module.exports = db;
