const Scan = require('../models/Scan');

/**
 * @desc    Get all scans
 * @route   GET /api/scan-history
 * @access  Public
 */
exports.getScans = async (req, res) => {
  try {
    const { search, format, startDate, endDate, type, deviceId } = req.query;
    let query = {};

    // Search by barcode value
    if (search) {
      query.barcodeValue = { $regex: search, $options: 'i' };
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by deviceId
    if (deviceId) {
      query.deviceId = deviceId;
    }

    // Filter by format
    if (format) {
      query.format = format;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.scannedAt = {};
      if (startDate) query.scannedAt.$gte = new Date(startDate);
      if (endDate) query.scannedAt.$lte = new Date(endDate);
    }

    const scans = await Scan.find(query).sort({ scannedAt: -1 }).limit(100);
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
    const { barcodeValue, format, deviceId, latitude, longitude, type } = req.body;

    if (!barcodeValue || !format) {
      return res.status(400).json({
        success: false,
        message: 'Please provide barcodeValue and format',
      });
    }

    // Check if barcode already scanned within the last 24 hours
    const alreadyScanned = await Scan.findOne({ 
      barcodeValue, 
      scannedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
    });

    const scan = await Scan.create({
      barcodeValue,
      format,
      deviceId,
      latitude,
      longitude,
      type: type || 'unknown'
    });

    res.status(201).json({
      success: true,
      alreadyScanned: !!alreadyScanned,
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

/**
 * @desc    Delete multiple scans
 * @route   DELETE /api/scan-history
 * @access  Public
 */
exports.deleteScans = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: 'IDs array is required',
      });
    }

    await Scan.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `Deleted ${ids.length} scans`,
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
 * @desc    Export scans as CSV
 * @route   GET /api/scan-history/export
 * @access  Public
 */
exports.exportScans = async (req, res) => {
  try {
    const { ids } = req.query;
    let query = {};
    if (ids) {
      query._id = { $in: ids.split(',') };
    }

    const scans = await Scan.find(query).sort({ scannedAt: -1 });
    
    // Create CSV header (incl. type now)
    let csv = 'Barcode Value,Format,Type,Scanned At,Device ID,Latitude,Longitude\n';
    
    // Add data rows
    scans.forEach(scan => {
      csv += `"${scan.barcodeValue}","${scan.format}","${scan.type}","${scan.scannedAt?.toISOString()}","${scan.deviceId}","${scan.latitude || ''}","${scan.longitude || ''}"\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('scan-history.csv');
    return res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting CSV',
      error: error.message,
    });
  }
};
