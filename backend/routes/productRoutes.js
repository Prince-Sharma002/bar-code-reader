const express = require('express');
const router = express.Router();
const { lookupProduct } = require('../controllers/productController');

router.get('/lookup/:code', lookupProduct);

module.exports = router;
