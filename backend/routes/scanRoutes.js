const express = require('express');
const router = express.Router();
const { getScans, storeScan, exportScans, deleteScans } = require('../controllers/scanController');

router.get('/scan-history', getScans);
router.post('/scan', storeScan);
router.delete('/scan-history', deleteScans);
router.get('/scan-history/export', exportScans);

module.exports = router;
