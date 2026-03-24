const express = require('express');
const { getLogs } = require('../controllers/adminLogController');

const router = express.Router();

router.get('/', getLogs);

module.exports = router;
