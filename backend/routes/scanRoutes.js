const express = require('express');
const router = express.Router();
const { getScans, storeScan } = require('../controllers/scanController');

router.get('/scan-history', getScans);
router.post('/scan', storeScan);

module.exports = router;
