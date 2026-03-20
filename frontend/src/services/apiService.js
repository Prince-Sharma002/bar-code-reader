import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ CHANGE THIS to your Render URL after deployment
// Example: 'https://barcode-reader-api.onrender.com/api'
const BASE_URL = 'http://192.168.1.3:5000/api';
const STORAGE_KEY = '@scans_history';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const saveToLocal = async (newScan) => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    let history = [];
    if (existing) {
      const parsed = JSON.parse(existing);
      // Handle both old array format and accidental object format
      history = Array.isArray(parsed) ? parsed : (parsed.data || []);
    }
    const updated = [newScan, ...history].slice(0, 100); // Keep last 100
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Local save error:', err);
  }
};

/**
 * Sends scan to backend and updates local sync status.
 */
export const storeScan = async (barcodeValue, format, deviceId = 'unknown', latitude = null, longitude = null) => {
  const newScan = {
    barcodeValue,
    format,
    deviceId,
    latitude,
    longitude,
    timestamp: new Date().toISOString(),
    synced: false,
  };

  // 1. Save locally first (immediate feedback)
  await saveToLocal(newScan);

  // 2. Try to sync with backend
  try {
    const response = await apiClient.post('/scan', newScan);
    return response.data;
  } catch (error) {
    console.warn('Sync failed, scan saved locally only.');
    throw error;
  }
};

/**
 * Fetches scan history. Tries backend, falls back to local.
 */
export const getScanHistory = async (params = {}) => {
  try {
    const response = await apiClient.get('/scan-history', { params });
    // IMPORTANT: Only save the array part to storage
    const scanArray = response.data.data || [];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scanArray));
    return scanArray;
  } catch (error) {
    console.log('Fetching from local cache...');
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existing) return [];
    
    const parsed = JSON.parse(existing);
    return Array.isArray(parsed) ? parsed : (parsed.data || []);
  }
};

/**
 * Returns the URL for CSV export
 */
export const getExportUrl = () => {
  return `${BASE_URL}/scan-history/export`;
};
