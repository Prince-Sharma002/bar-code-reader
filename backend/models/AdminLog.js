const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
  },
  adminName: {
    type: String,
    default: 'Admin', // Default to Admin, can be overridden if auth is added
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Can store objects, strings, etc.
  },
  deviceId: {
    type: String,
    default: 'Unknown',
  },
  ipAddress: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('AdminLog', adminLogSchema);
