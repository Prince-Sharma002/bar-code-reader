const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, default: 'demo_user' },
  name: { type: String, required: true },
  ean: { type: String },
  upc: { type: String },
  gtin: { type: String },
  asin: { type: String },
  fnsku: { type: String },
  barcode: { type: String }, // For custom barcodes
  image: { type: String },
  price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

// Indexes to speed up barcode finding
productSchema.index({ ean: 1 }, { sparse: true });
productSchema.index({ upc: 1 }, { sparse: true });
productSchema.index({ gtin: 1 }, { sparse: true });
productSchema.index({ asin: 1 }, { sparse: true });
productSchema.index({ fnsku: 1 }, { sparse: true });
productSchema.index({ barcode: 1 }, { sparse: true });
productSchema.index({ sku: 1 });

module.exports = mongoose.model('Product', productSchema);
