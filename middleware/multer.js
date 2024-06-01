const multer = require('multer');
const path = require('path');

// Set storage engine for profile pictures
const profileStorage = multer.diskStorage({
  destination: './public/uploads/', // Destination folder for profile pictures
  filename: function (req, file, cb) {
    // Generate a unique filename based on timestamp and original file extension
    cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
  },
});

// Set storage engine for property images
const propertyStorage = multer.diskStorage({
    destination: './public/uploads/properties/',
    filename: function (req, file, cb) {
        cb(null, 'property-' + Date.now() + path.extname(file.originalname));
    },
});

// Initialize upload variables for profile pictures and property images
const uploadProfilePicture = multer({
  storage: profileStorage,
  limits: { fileSize: 4000000 }, // 4MB file size limit (adjust as necessary)
  fileFilter: function (req, file, cb) {
    checkProfilePictureFileType(file, cb);
  },
});

const uploadPropertyImage = multer({
    storage: propertyStorage,
    limits: { fileSize: 4000000 },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images Only!');
        }
    },
});

// Check file type for profile pictures
function checkProfilePictureFileType(file, cb) {
  // Allowed file extensions for profile pictures
  const filetypes = /jpeg|jpg|png|gif/;
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}

// Check file type for property images
function checkPropertyImageFileType(file, cb) {
  // Allowed file extensions for property images
  const filetypes = /jpeg|jpg|png|gif/;
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}

module.exports = { uploadProfilePicture, uploadPropertyImage };
