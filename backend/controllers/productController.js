const Product = require('../models/Product');

// Assume demo_user for current implementation
const getUserId = (req) => req.user?.id || 'demo_user';

/**
 * @desc    Lookup product by any barcode/sku
 * @route   GET /api/products/lookup/:code
 * @access  Public
 */
exports.lookupProduct = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ ok: false, message: 'Code is required' });
    }

    const product = await Product.findOne({
      user_id: userId,
      $or: [
        { sku: code },
        { ean: code },
        { upc: code },
        { gtin: code },
        { asin: code },
        { fnsku: code },
        { barcode: code }
      ]
    });

    if (!product) {
      return res.status(404).json({ ok: false, message: 'Product not found' });
    }

    res.json({ ok: true, product });
  } catch (error) {
    console.error('Lookup product error:', error);
    res.status(500).json({ ok: false, message: 'Server Error' });
  }
};
