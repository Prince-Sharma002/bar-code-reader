const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  image: { type: String }
});

const orderSchema = new mongoose.Schema({
  order_number: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, default: 'demo_user' }, // To map with auth later
  customer: {
    name: { type: String },
    phone: { type: String },
    address: { type: String }
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['pending', 'processing', 'picked', 'packed', 'ready_to_ship', 'handed_to_courier', 'delivered', 'returned'],
    default: 'pending'
  },
  platform: { type: String, default: 'Custom' },
  tracking_number: { type: String },
  return_tracking_number: { type: String },
  awb: { type: String },
  carrier: { type: String },
  total_amount: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Create indexes for fast lookups
orderSchema.index({ order_number: 1 });
orderSchema.index({ tracking_number: 1 });
orderSchema.index({ return_tracking_number: 1 });
orderSchema.index({ awb: 1 });
orderSchema.index({ user_id: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
