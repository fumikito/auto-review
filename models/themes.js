var mongoose = require('mongoose');

var ThemeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  version: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: false
  },
  success: {
    type: Boolean,
    default: false
  },
  message: {
    type: String
  },
  created: Date,
  updated: Date,
  finished: Date
});


// Hook before saving
ThemeSchema.pre('save', function (next, done) {
  this.updated = new Date();
  next();
});

// Register model
var Theme = mongoose.model('Theme', ThemeSchema);

module.exports = Theme;
