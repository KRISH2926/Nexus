const multer = require("multer");
const path = require("path");

// Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // folder where files will be saved
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// Optional: file filter (only pdf, images etc.)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|jpg|jpeg|png/;
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, JPG, JPEG, PNG files allowed"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

module.exports = upload;