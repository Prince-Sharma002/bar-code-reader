const express = require('express');
const router = express.Router();
const { 
  lookupBarcode,
  getAllOrders,
  getFulfillmentQueue,
  getOrderById,
  verifyItems,
  updateStatus
} = require('../controllers/orderController');

// Define specific routes before parameter routes (like /:id)
router.get('/lookup-barcode', lookupBarcode);
router.get('/fulfillment-queue', getFulfillmentQueue);
router.get('/', getAllOrders);

router.get('/:id', getOrderById);
router.post('/:id/verify-items', verifyItems);
router.put('/:id/status', updateStatus);

module.exports = router;
