const Scan = require('../models/Scan');

/**
 * @desc    Get all scans
 * @route   GET /api/scan-history
 * @access  Public
 */
exports.getScans = async (req, res) => {
  try {
    const scans = await Scan.find().sort({ scannedAt: -1 }).limit(50);
    res.status(200).json({
      success: true,
      count: scans.length,
      data: scans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

/**
 * @desc    Store a new scan
 * @route   POST /api/scan
 * @access  Public
 */
exports.storeScan = async (req, res) => {
  try {
    const { barcodeValue, format, deviceId } = req.body;

    if (!barcodeValue || !format) {
      return res.status(400).json({
        success: false,
        message: 'Please provide barcodeValue and format',
      });
    }

    const scan = await Scan.create({
      barcodeValue,
      format,
      deviceId,
    });

    res.status(201).json({
      success: true,
      data: scan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};
