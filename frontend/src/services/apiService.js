import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ CHANGE THIS to your Render URL after deployment
// Example: 'https://barcode-reader-api.onrender.com/api'
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
const STORAGE_KEY = '@scans_history';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const saveToLocal = async (newScan) => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    let history = [];
    if (existing) {
      const parsed = JSON.parse(existing);
      history = Array.isArray(parsed) ? parsed : (parsed.data || []);
    }
    
    // If scanning again or updating, prevent duplications of same scan
    // (Check if a scan with same barcodeValue and very close timestamp exists)
    const filtered = history.filter(s => {
       if (newScan._id && s._id === newScan._id) return false;
       if (!newScan._id && s.barcodeValue === newScan.barcodeValue && Math.abs(new Date(s.timestamp) - new Date(newScan.timestamp)) < 2000) return false;
       return true;
    });

    const updated = [newScan, ...filtered].slice(0, 100);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Local save error:', err);
  }
};

export const authLogin = async (email, password) => {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data;
};



export const getProfile = async () => {
  const res = await apiClient.get('/auth/profile');
  return res.data;
};

export const updateProfile = async (profileData) => {
  const res = await apiClient.put('/auth/profile', profileData);
  return res.data;
};

export const storeScan = async (barcodeValue, format, deviceId = 'unknown', latitude = null, longitude = null, type = 'unknown') => {
  const newScan = {
    barcodeValue,
    format,
    deviceId,
    latitude,
    longitude,
    type,
    timestamp: new Date().toISOString(),
    synced: false,
  };

  // 1. Check for duplicates locally (within last 60 seconds)
  let alreadyScanned = false;
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (existing) {
       const history = JSON.parse(existing);
       const historyArray = Array.isArray(history) ? history : (history.data || []);
       // Check if this barcode was scanned in the last minute
       const recent = historyArray.find(s => 
          s.barcodeValue === barcodeValue && 
          (new Date() - new Date(s.timestamp)) < 60000
       );
       if (recent) alreadyScanned = true;
    }
  } catch (e) {}

  // 2. Save locally first (immediate feedback)
  await saveToLocal(newScan);

  // 3. Try to sync with backend
  try {
    const response = await apiClient.post('/scan', newScan);
    if (response.data.success && response.data.data) {
       // Update local storage with the backend version (which has _id)
       await saveToLocal(response.data.data);
       return { ...response.data, alreadyScanned };
    }
    return { ...response.data, alreadyScanned };
  } catch (error) {
    console.warn('Sync failed, scan saved locally only.');
    return { ok: true, alreadyScanned };
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
export const getExportUrl = (ids = []) => {
  const query = ids.length > 0 ? `?ids=${ids.join(',')}` : '';
  return `${BASE_URL}/scan-history/export${query}`;
};

export const deleteScans = async (ids) => {
  try {
    console.log('API: Deleting scans with IDs:', ids);
    // Use query params for DELETE to avoid issues with body stripping on some platforms/proxies
    const response = await apiClient.delete(`/scan-history?ids=${ids.join(',')}`);
    
    console.log('API: Delete response:', response.data);
    
    // Also remove from local storage to keep them in sync
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      if (existing) {
        const history = JSON.parse(existing);
        const historyArray = Array.isArray(history) ? history : (history.data || []);
        const updated = historyArray.filter(s => {
           const scanId = s._id || s.id;
           return !ids.includes(scanId);
        });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        console.log('Local Storage: Cleared deleted items');
      }
    } catch (localErr) {
      console.warn('Could not update local storage after delete:', localErr);
    }

    return response.data;
  } catch (error) {
    console.error('Error deleting scans:', error.response?.data || error.message);
    throw error;
  }
};

export const lookupProduct = async (code) => {
  try {
    const response = await apiClient.get(`/products/lookup/${code}`);
    return response.data;
  } catch (error) {
    console.warn('Product lookup failed:', error);
    throw error;
  }
};

// --- Mock Data for Testing ---
// --- Mock Data for Testing ---
let MOCK_ORDERS = [
  {
    _id: 'mock_1',
    order_number: 'ORD-2024-001',
    status: 'pending',
    is_verified: false,
    customer: { name: 'John Doe', phone: '+91 98765 43210', address: '123 Warehouse Lane, Bangalore' },
    items: [
      { sku: 'SHIRT-BLUE-L', name: 'Blue Cotton Shirt (L)', quantity: 2, scanned_count: 0, barcode: '1234567890123' },
      { sku: 'PANTS-DENIM-32', name: 'Denim Jeans (32)', quantity: 1, scanned_count: 0, barcode: '7890123456789' }
    ],
    platform: 'Shopify',
    created_at: new Date().toISOString()
  },
  {
    _id: 'mock_2',
    order_number: 'ORD-2024-002',
    status: 'ready_to_ship',
    is_verified: true,
    customer: { name: 'Jane Smith', phone: '+91 88888 77777', address: '456 Retail Blvd, Mumbai' },
    items: [
      { sku: 'HAT-RED', name: 'Red Baseball Cap', quantity: 1, scanned_count: 1, barcode: '111222333444' }
    ],
    platform: 'Amazon',
    created_at: new Date().toISOString()
  },
  {
    _id: 'mock_3',
    order_number: 'ORD-2024-003',
    status: 'pending',
    is_verified: false,
    customer: { name: 'Bob Wilson', phone: '+91 12345 67890', address: '789 Commercial St, Delhi' },
    items: [
      { sku: 'MUG-WHT', name: 'White Ceramic Mug', quantity: 4, scanned_count: 0, barcode: '555666777888' }
    ],
    platform: 'WooCommerce',
    created_at: new Date().toISOString()
  },
  {
    _id: 'mock_4',
    order_number: 'RET-005-BETA',
    status: 'handed_to_courier',
    is_verified: true,
    customer: { name: 'Sarah Miller', phone: '+1555666778', address: '456 Elm St, FL' },
    items: [
      { sku: 'SHO-RUN-42', name: 'Running Shoes - Size 42', quantity: 1, scanned_count: 1, barcode: '012345678905' }
    ],
    return_tracking_number: 'RET333222111',
    platform: 'Amazon',
    created_at: new Date().toISOString()
  },
  {
    _id: 'mock_5',
    order_number: 'RET-001-ALPHA',
    status: 'delivered',
    is_verified: true,
    customer: { name: 'Bob Wilson', phone: '+1122334455', address: '789 Pine Rd, TX' },
    items: [
      { sku: 'TSH-BLU-M', name: 'Blue T-Shirt - Medium', quantity: 1, scanned_count: 1, barcode: '8901234567890' }
    ],
    return_tracking_number: 'RET999888777',
    platform: 'Shopify',
    created_at: new Date().toISOString()
  }
];

export const lookupOrderBarcode = async (barcode) => {
  try {
    const response = await apiClient.get(`/orders/lookup-barcode?code=${barcode}`);
    return response.data;
  } catch (error) {
    console.log('Mocking barcode lookup for:', barcode);
    for (const order of MOCK_ORDERS) {
      const item = order.items.find(i => i.barcode === barcode);
      if (item) return { ok: true, type: 'product', data: item, order_id: order._id };
    }
    const order = MOCK_ORDERS.find(o => o.order_number === barcode || o.return_tracking_number === barcode);
    if (order) {
       const type = order.return_tracking_number === barcode ? 'return' : 'order';
       return { ok: true, type, orders: [order] };
    }
    throw error;
  }
};

export const getOrders = async () => {
  try {
    const response = await apiClient.get('/orders');
    if (response.data.ok && response.data.orders?.length > 0) return response.data;
    return { ok: true, orders: MOCK_ORDERS };
  } catch (error) {
    return { ok: true, orders: MOCK_ORDERS };
  }
};

export const getOrderDetails = async (id) => {
  try {
    const response = await apiClient.get(`/orders/${id}`);
    if (response.data.ok) return response.data;
    const mock = MOCK_ORDERS.find(o => o._id === id);
    if (mock) return { ok: true, order: mock };
    throw new Error('Order not found');
  } catch (error) {
    const mock = MOCK_ORDERS.find(o => o._id === id);
    if (mock) return { ok: true, order: mock };
    throw error;
  }
};

export const verifyOrderItems = async (id, scannedBarcodes) => {
  try {
    const response = await apiClient.post(`/orders/${id}/verify-items`, { scanned_barcodes: scannedBarcodes });
    return response.data;
  } catch (error) {
    console.log('Mocking verification logic for:', id);
    const orderIndex = MOCK_ORDERS.findIndex(o => o._id === id);
    if (orderIndex === -1) throw error;
    const order = MOCK_ORDERS[orderIndex];

    // Simulate verification
    const verification = order.items.map(item => {
      const count = scannedBarcodes.filter(b => b === item.barcode).length;
      return {
        ...item,
        verified: count >= item.quantity,
        scanned_count: count
      };
    });

    const verifiedCount = verification.filter(v => v.verified).length;
    const allVerified = verifiedCount === order.items.length;
    const extraScans = scannedBarcodes.filter(b => !order.items.find(i => i.barcode === b));

    // UPDATE MOCK STATE
    if (allVerified) {
       MOCK_ORDERS[orderIndex].is_verified = true;
    }

    return {
      ok: true,
      verified_count: verifiedCount,
      total_items: order.items.length,
      all_verified: allVerified,
      verification: verification,
      extra_scans: extraScans
    };
  }
};

export const updateOrderStatus = async (id, status) => {
  try {
    const response = await apiClient.put(`/orders/${id}/status`, { status });
    return response.data;
  } catch (error) {
    console.log('Mocking status update to:', status);
    const index = MOCK_ORDERS.findIndex(o => o._id === id);
    if (index !== -1) {
      // PREVENT PACKING WITHOUT VERIFICATION
      if (status === 'packed' && !MOCK_ORDERS[index].is_verified) {
         return { ok: false, message: 'Verification required before packing.' };
      }
      
      MOCK_ORDERS[index] = { ...MOCK_ORDERS[index], status };
      return { ok: true, order: MOCK_ORDERS[index] };
    }
    throw error;
  }
};
