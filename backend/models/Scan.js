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
});

module.exports = mongoose.model('Scan', scanSchema);
