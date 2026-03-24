const AdminLog = require('../models/AdminLog');

/**
 * @desc    Get all admin logs
 * @route   GET /api/admin-logs
 * @access  Public
 */
exports.getLogs = async (req, res) => {
  try {
    const logs = await AdminLog.find().sort({ createdAt: -1 }).limit(200);
    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
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
 * Helper function to create a log event internally
 * @param {string} action The type of action (e.g. 'SCANNED_BARCODE')
 * @param {object} details Object containing detail about the action
 * @param {object} req Express request object
 */
exports.createLogEvent = async (action, details, req) => {
  try {
    const adminName = req?.body?.adminName || req?.query?.adminName || 'Admin/System';
    const deviceId = req?.body?.deviceId || req?.query?.deviceId || 'Unknown';
    const ipAddress = req?.ip || req?.connection?.remoteAddress || 'Unknown';

    console.log(`Creating Admin Log: ${action}`);
    await AdminLog.create({
      action,
      adminName,
      details,
      deviceId,
      ipAddress
    });
    console.log(`Admin Log Created: ${action}`);
  } catch (error) {
    console.error('Error creating admin log:', error.message);
  }
};
