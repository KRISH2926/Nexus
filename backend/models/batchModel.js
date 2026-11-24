const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  startYear: {
    type: Number,
    required: true
  },
  endYear: {
    type: Number,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Batch", batchSchema);