const Order = require('../models/Order');
const Product = require('../models/Product');

// Assume demo_user for current implementation
const getUserId = (req) => req.user?.id || 'demo_user';

// GET /api/orders/lookup-barcode?code=
exports.lookupBarcode = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ ok: false, message: 'Barcode is required' });
    }

    let orders = [];

    // 1. Try exact match on order_number
    let result = await Order.find({ user_id: userId, order_number: code });

    // 2. Try tracking_number if not found
    if (!result || result.length === 0) {
      result = await Order.find({ user_id: userId, tracking_number: code });
    }

    // 3. Try AWB if not found
    if (!result || result.length === 0) {
      result = await Order.find({ user_id: userId, awb: code });
    }
    
    // 4. Try return_tracking_number
    if (!result || result.length === 0) {
       result = await Order.find({ user_id: userId, return_tracking_number: code });
    }

    let type = 'order';
    if (result && result.length > 0) {
      orders = result;
      // Check if it was found via return_tracking_number
      if (orders.some(o => o.return_tracking_number === code)) {
        type = 'return';
      }
    }
    
    // 5. Try product barcode
    if (!result || result.length === 0) {
      const products = await Product.find({
        user_id: userId,
        $or: [
          { ean: code }, { upc: code }, { gtin: code },
          { asin: code }, { fnsku: code }, { barcode: code }, { sku: code }
        ]
      });

      if (products && products.length > 0) {
        const skus = products.map(p => p.sku);
        result = await Order.find({
          user_id: userId,
          'items.sku': { $in: skus },
          status: { $in: ['pending', 'processing', 'picked', 'packed'] }
        }).sort({ created_at: -1 }).limit(10);
        
        if (result && result.length > 0) {
          orders = result;
          type = 'product';
        }
      }
    }

    return res.json({
      ok: true,
      orders,
      barcode: code,
      type
    });

  } catch (error) {
    console.error('Lookup barcode error:', error);
    res.status(500).json({ ok: false, message: 'Server Error' });
  }
};

// GET /api/orders
exports.getAllOrders = async (req, res) => {
  try {
    const userId = getUserId(req);
    const orders = await Order.find({ user_id: userId }).sort({ created_at: -1 });
    res.json({ ok: true, orders });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Server Error' });
  }
};

// GET /api/orders/fulfillment-queue
exports.getFulfillmentQueue = async (req, res) => {
  try {
    const userId = getUserId(req);
    const orders = await Order.find({
      user_id: userId,
      status: { $in: ['pending', 'processing'] }
    }).sort({ created_at: 1 }); // Oldest first
    res.json({ ok: true, orders });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Server Error' });
  }
};

// GET /api/orders/:id
exports.getOrderById = async (req, res) => {
  try {
    const userId = getUserId(req);
    const order = await Order.findOne({ _id: req.params.id, user_id: userId });
    
    if (!order) {
      return res.status(404).json({ ok: false, message: 'Order not found' });
    }

    res.json({ ok: true, order });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Server Error' });
  }
};

// POST /api/orders/:id/verify-items
exports.verifyItems = async (req, res) => {
  try {
    const userId = getUserId(req);
    const orderId = req.params.id;
    const { scanned_barcodes } = req.body;

    if (!scanned_barcodes || !Array.isArray(scanned_barcodes)) {
      return res.status(400).json({ ok: false, message: 'scanned_barcodes array is required' });
    }

    const order = await Order.findOne({ _id: orderId, user_id: userId });
    if (!order) {
      return res.status(404).json({ ok: false, message: 'Order not found' });
    }

    // Get product details for all items in the order
    const skus = order.items.map(i => i.sku);
    const products = await Product.find({ user_id: userId, sku: { $in: skus } });
    
    // Map product barcodes to SKUs
    const productMap = {}; // sku -> product
    products.forEach(p => productMap[p.sku] = p);

    const verification = order.items.map(item => {
      const p = productMap[item.sku];
      
      const itemBarcodes = [item.sku];
      if (p) {
        if (p.ean) itemBarcodes.push(p.ean);
        if (p.upc) itemBarcodes.push(p.upc);
        if (p.gtin) itemBarcodes.push(p.gtin);
        if (p.asin) itemBarcodes.push(p.asin);
        if (p.fnsku) itemBarcodes.push(p.fnsku);
        if (p.barcode) itemBarcodes.push(p.barcode);
      }

      // Check if any of this item's recognized barcodes have been scanned
      const verified = scanned_barcodes.some(code => itemBarcodes.includes(code));

      return {
        ...item.toObject(),
        barcodes: itemBarcodes,
        verified
      };
    });

    const allVerified = verification.every(v => v.verified);
    
    // Find extra scans
    // Collect all valid barcodes for the order
    const allValidBarcodesForOrder = new Set();
    verification.forEach(v => v.barcodes.forEach(b => allValidBarcodesForOrder.add(b)));
    
    const extraScans = scanned_barcodes.filter(code => !allValidBarcodesForOrder.has(code));

    res.json({
      ok: true,
      verification,
      all_verified: allVerified,
      verified_count: verification.filter(v => v.verified).length,
      total_items: verification.length,
      extra_scans: extraScans
    });

  } catch (error) {
    console.error('Verify items error:', error);
    res.status(500).json({ ok: false, message: 'Server Error' });
  }
};

// PUT /api/orders/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const userId = getUserId(req);
    const orderId = req.params.id;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'picked', 'packed', 'ready_to_ship', 'handed_to_courier', 'delivered', 'returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ ok: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, user_id: userId },
      { $set: { status, updated_at: new Date() } },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ ok: false, message: 'Order not found' });
    }

    res.json({ ok: true, order });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ ok: false, message: 'Server Error' });
  }
};
