import axios from 'axios';

// ⚠️ IMPORTANT: Change this IP to your computer's local IP address
// Run `ipconfig` on Windows or `ifconfig` on Mac/Linux to find your IP
// Example: 'http://192.168.1.100:5000/api'
// For Android Emulator use: 'http://10.0.2.2:5000/api'
const BASE_URL = 'http://192.168.1.100:5000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Sends a newly scanned barcode to the backend for storage.
 * @param {string} barcodeValue - The raw value of the scanned barcode.
 * @param {string} format - The barcode format (e.g., QR_CODE, EAN_13).
 * @param {string} deviceId - Optional device identifier.
 */
export const storeScan = async (barcodeValue, format, deviceId = 'unknown') => {
  try {
    const response = await apiClient.post('/scan', {
      barcodeValue,
      format,
      deviceId,
    });
    return response.data;
  } catch (error) {
    console.error('Error storing scan:', error.message);
    throw error;
  }
};

/**
 * Fetches the scan history from the backend.
 * Returns the latest 50 scans sorted by most recent.
 */
export const getScanHistory = async () => {
  try {
    const response = await apiClient.get('/scan-history');
    return response.data;
  } catch (error) {
    console.error('Error fetching scan history:', error.message);
    throw error;
  }
};
