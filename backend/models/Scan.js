const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  barcodeValue: {
    type: String,
    required: [true, 'Barcode value is required'],
  },
  format: {
    type: String,
    required: [true, 'Barcode format is required'],
  },
  scannedAt: {
    type: Date,
    default: Date.now,
  },
  deviceId: {
    type: String,
    default: 'Unknown',
  },
  latitude: {
    type: Number,
  },
  longitude: {
    type: Number,
  },
  type: {
    type: String,
    enum: ['order', 'return', 'product', 'unknown'],
    default: 'unknown'
  }
});

module.exports = mongoose.model('Scan', scanSchema);
