import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Alert,
  TextInput,
} from 'react-native';
// SDK 54: Use CameraView + useCameraPermissions from expo-camera
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { useState as ReactState } from 'react'; // To avoid conflict if any
import { storeScan, lookupOrderBarcode, lookupProduct } from '../services/apiService';
import * as ImagePicker from 'expo-image-picker';
import { BarCodeScanner } from 'expo-barcode-scanner';
import Colors from '../constants/Colors';

// All barcode formats supported by CameraView in SDK 54
const BARCODE_TYPES = [
  'qr',
  'ean13',
  'ean8',
  'code128',
  'code39',
  'code93',
  'upc_a',
  'upc_e',
  'pdf417',
  'aztec',
  'datamatrix',
  'itf14',
];

const ScannerScreen = () => {
  // SDK 54 permission hook
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState(null);

  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [torch, setTorch] = useState(false); // Flashlight state
  const [alreadyScannedAlert, setAlreadyScannedAlert] = useState(false);
  const [foundOrders, setFoundOrders] = useState([]);
  const [foundProduct, setFoundProduct] = useState(null);
  const [scanType, setScanType] = useState('unknown'); // 'unknown', 'product', 'order', 'return'
  const navigation = useNavigation();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Request location permission on load
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    })();
  }, []);

  // Looping top-to-bottom laser line animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 200,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  /** Play a "beep" sound */
  const playBeep = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://raw.githubusercontent.com/fede-87/bar-code-reader/main/frontend/assets/beep.mp3' }
      );
      await sound.playAsync();
    } catch (error) {
      console.log('Error playing beep:', error);
      Vibration.vibrate(80); // Fallback
    }
  };

  /**
   * Called by CameraView when a barcode enters the viewfinder.
   */
  const handleBarcodeScanned = async ({ type, data }) => {
    if (scanned) return;

    setScanned(true);
    Vibration.vibrate(80);
    playBeep();

    const format = normalizeFormat(type);
    setScanResult({ value: data, format });

    // Try to get location
    let latitude = null;
    let longitude = null;
    if (locationPermission) {
      try {
        const location = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.Balanced 
        });
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      } catch (err) {
        console.warn('Could not get location:', err);
      }
    }

    // Slide result panel up
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();

    // Persist to backend and try to find order
    setIsSaving(true);
    setAlreadyScannedAlert(false);
    setFoundOrders([]);

    try {
      // 1. Store scan with default 'unknown' first
      const storeRes = await storeScan(data, format, Device.deviceName || 'Unknown Device', latitude, longitude, 'unknown');
      
      if (storeRes?.alreadyScanned) {
        setAlreadyScannedAlert(true);
      }

      // 2. Try to find an order
      const orderResult = await lookupOrderBarcode(data).catch(() => null);
      
      if (orderResult && orderResult.ok && orderResult.orders && orderResult.orders.length > 0) {
        setFoundOrders(orderResult.orders);
        const type = orderResult.type || 'order';
        setScanType(type);
        
        // Update the scan type in backend now that we know it
        if (storeRes.data?._id) {
           // We could add an updateScan api, but for now let's just make sure future scans are accurate
        }
        
        Vibration.vibrate([100, 100, 100]);
      } else {
        // 3. Try to find a product if no order matches
        try {
          const productResult = await lookupProduct(data);
          if (productResult && productResult.ok && productResult.product) {
            setFoundProduct(productResult.product);
            setScanType('product');
            Vibration.vibrate([100, 100]);
          } else {
            setScanType('unknown');
          }
        } catch (err) {
          setScanType('unknown');
        }
      }
      
    } catch {
      // Handled individually
    } finally {
      setIsSaving(false);
    }
  };

  /** Maps raw CameraView type strings to clean display names */
  const normalizeFormat = (type) => {
    const map = {
      qr: 'QR_CODE',
      ean13: 'EAN_13',
      ean8: 'EAN_8',
      code128: 'CODE_128',
      code39: 'CODE_39',
      code93: 'CODE_93',
      upc_a: 'UPC_A',
      upc_e: 'UPC_E',
      pdf417: 'PDF_417',
      aztec: 'AZTEC',
      datamatrix: 'DATA_MATRIX',
      itf14: 'ITF_14',
    };
    return map[type?.toLowerCase()] || type?.toUpperCase() || 'UNKNOWN';
  };

  const handleScanAgain = () => {
    setScanned(false);
    setScanResult(null);
    setAlreadyScannedAlert(false);
    setFoundOrders([]);
    setFoundProduct(null);
    setScanType('unknown');
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
  };

  const handleOpenGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleScanAgain(); // Reset previous scan result state before processing new image
        const uri = result.assets[0].uri;
        setIsSaving(true);
        console.log('Picked Image URI:', uri);
        
        // WEB SPECIFIC SCANNING (BarCodeScanner.scanFromURLAsync NOT supported on Web)
        if (require('react-native').Platform.OS === 'web') {
           try {
             const { BrowserMultiFormatReader } = require('@zxing/library');
             const reader = new BrowserMultiFormatReader();
             
             // Create an image element to get its source
             const results = await reader.decodeFromImageUrl(uri);
             
             if (results && results.text) {
                console.log('Web Scan Success:', results.text);
                const format = results.format ? results.format.toString() : 'UNKNOWN';
                handleBarcodeScanned({ type: format, data: results.text });
                return;
             }
           } catch (webErr) {
             console.log('Web Barcode Decoder failed, trying fallback library...', webErr);
             
             // TRY jsqr as a fallback for QR specifically if zxing missed it
             try {
                const img = new Image();
                img.src = uri;
                await new Promise((resolve) => (img.onload = resolve));
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const jsQR = require('jsqr');
                const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
                if (qrCode) {
                   handleBarcodeScanned({ type: 'qr', data: qrCode.data });
                   return;
                }
             } catch (qrErr) {
                console.log('Fallback QR Decoder failed:', qrErr);
             }
           }
        }
        
        // NATIVE OR FALLBACK (iOS/Android will use BarCodeScanner)
        try {
           const results = await BarCodeScanner.scanFromURLAsync(uri);
           if (results && results.length > 0) {
              const { type, data } = results[0];
              handleBarcodeScanned({ type, data });
           } else {
              Alert.alert('No Barcode Found', 'Could not find any readable barcode in the selected image. Please try a clearer screenshot.');
           }
        } catch (nativeErr) {
           console.log('Native BarCodeScanner failed:', nativeErr);
           Alert.alert('Scan Failed', 'This device does not support image barcode scanning or the image is unreadable.');
        }
      }
    } catch (error) {
       console.error('Gallery Picking Error:', error);
       Alert.alert('Error', 'Failed to scan image from gallery.');
    } finally {
       setIsSaving(false);
    }
  };

  // --- Permission Handlers ---
  if (!permission) return <View style={styles.centered}><Text style={styles.statusText}>📷 Loading camera...</Text></View>;

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.bigEmoji}>🚫</Text>
        <Text style={styles.errorTitle}>Camera Access Required</Text>
        <Text style={styles.statusText}>Permission is needed to scan barcodes.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header with Torch Toggle */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>📷 Scanner</Text>
            <Text style={styles.headerSub}>Point at any barcode</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.torchBtn, torch && styles.torchBtnActive]} 
            onPress={() => setTorch(!torch)}
            activeOpacity={0.7}
          >
            <Text style={styles.torchIcon}>{torch ? '🔦' : '🕯️'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.galleryBtn} 
            onPress={handleOpenGallery}
            activeOpacity={0.7}
          >
            <Text style={styles.torchIcon}>🖼️</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Manual Entry Field */}
      <View style={styles.manualEntryWrap}>
        <TextInput
          style={styles.manualInput}
          placeholder="Enter barcode manually..."
          placeholderTextColor="#555"
          value={manualCode}
          onChangeText={setManualCode}
          onSubmitEditing={() => {
            if (manualCode.trim()) {
              handleBarcodeScanned({ data: manualCode.trim(), type: 'MANUAL' });
              setManualCode('');
            }
          }}
        />
        <TouchableOpacity 
          style={styles.manualBtn}
          onPress={() => {
            if (manualCode.trim()) {
              handleBarcodeScanned({ data: manualCode.trim(), type: 'MANUAL' });
              setManualCode('');
            }
          }}
        >
          <Text style={styles.manualBtnText}>GO</Text>
        </TouchableOpacity>
      </View>

      {/* Camera Viewfinder */}
      <View style={styles.cameraWrap}>
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={torch}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
        >
          {/* Overlay with Cutout effect */}
          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />

              {!scanned && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    { 
                      backgroundColor: Colors[scanType] || Colors.primary,
                      shadowColor: Colors[scanType] || Colors.primary,
                      transform: [{ translateY: scanLineAnim }] 
                    },
                  ]}
                />
              )}

              {scanned && (
                <View style={[styles.successOverlay, { backgroundColor: (Colors[scanType] || Colors.primary) + '20' }]}>
                  <Text style={[styles.successCheck, { color: Colors[scanType] || Colors.primary }]}>✓</Text>
                </View>
              )}
            </View>
          </View>
        </CameraView>
      </View>

      {/* Scan Result Panel */}
      {scanResult && (
        <Animated.View
          style={[
            styles.resultPanel,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.resultRow}>
            <Text style={styles.resultBigIcon}>
               {scanType === 'return' ? '📦🔄' : scanType === 'product' ? '🍱' : scanType === 'order' ? '🎯' : '📄'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaLabel}>{scanType === 'return' ? 'RETURN LABEL' : scanType === 'product' ? 'INVENTORY ITEM' : 'Format'}</Text>
              <Text style={[styles.formatText, { color: Colors[scanType] || Colors.primary }]}>
                 {scanType === 'return' ? 'Return Shipment Found' : scanType === 'product' ? foundProduct?.name : scanResult.format}
              </Text>
            </View>
            <View style={[styles.saveBadge, { borderColor: (Colors[scanType] || Colors.primary) + '50' }]}>
              <Text style={[styles.saveBadgeText, { color: Colors[scanType] || Colors.primary }]}>
                {isSaving ? '⏳ Processing…' : (scanType === 'return' ? '✅ Identified' : '✅ Saved')}
              </Text>
            </View>
          </View>

          {scanType === 'product' && foundProduct && (
            <View style={styles.productDetailsBox}>
               {foundProduct.image && (
                 <View style={styles.productImagePlaceholder}>
                    <Text style={{ fontSize: 40 }}>📦</Text>
                 </View>
               )}
               <View style={styles.productInfoRow}>
                  <View>
                    <Text style={styles.metaLabel}>Price</Text>
                    <Text style={styles.productPriceText}>₹{foundProduct.price || 0}</Text>
                  </View>
                  <View>
                    <Text style={styles.metaLabel}>Current Stock</Text>
                    <Text style={[styles.productStockText, foundProduct.stock < 5 && { color: '#F44336' }]}>
                       {foundProduct.stock || 0} units
                    </Text>
                  </View>
               </View>
            </View>
          )}

          <View style={styles.valueBox}>
            <Text style={styles.metaLabel}>{scanType === 'return' ? 'Return Tracking' : 'Scanned Value'}</Text>
            <Text style={styles.valueText} selectable numberOfLines={4}>
              {scanResult.value}
            </Text>
          </View>

          {scanType === 'return' && (
            <View style={styles.returnAlertBox}>
              <Text style={styles.returnAlertText}>This order is being returned. Click below to view details and mark as received.</Text>
            </View>
          )}

          {foundOrders.length > 0 && (
            <View style={styles.ordersBox}>
              <Text style={styles.metaLabel}>Matching Orders</Text>
              {foundOrders.map(order => (
                <TouchableOpacity 
                   key={order._id} 
                   style={styles.orderLinkBtn}
                   onPress={() => navigation.navigate('OrderDetail', { orderId: order._id })}
                >
                  <Text style={styles.orderLinkText}>📦 Order {order.order_number}</Text>
                  <Text style={styles.orderStatusText}>{order.status}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity 
             style={[styles.scanAgainBtn, { backgroundColor: Colors[scanType] || Colors.primary }]} 
             onPress={handleScanAgain}
          >
            <Text style={styles.scanAgainText}>📷  Scan Another</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const FRAME = 230;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  centered: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', padding: 32 },
  
  header: { paddingTop: 58, paddingHorizontal: 24, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#555', marginTop: 4 },
  
  // Manual Entry Styles
  manualEntryWrap: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    marginBottom: 16
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333'
  },
  manualBtn: {
    backgroundColor: '#00E5FF',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  manualBtnText: {
    color: '#0A0A0A',
    fontWeight: '800',
    fontSize: 13
  },
  
  torchBtn: {
    backgroundColor: '#1A1A1A',
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  torchBtnActive: { borderColor: '#00E5FF', backgroundColor: '#00E5FF20' },
  galleryBtn: {
    backgroundColor: '#1A1A1A',
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
    marginLeft: 10
  },
  torchIcon: { fontSize: 20 },

  cameraWrap: { marginHorizontal: 16, borderRadius: 22, overflow: 'hidden', height: 380, borderWidth: 1, borderColor: '#1E1E1E' },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: FRAME, height: FRAME, overflow: 'hidden' },
  
  corner: { position: 'absolute', width: 26, height: 26, borderColor: '#00E5FF', borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  
  scanLine: { position: 'absolute', left: 4, right: 4, height: 2, shadowOpacity: 1, shadowRadius: 10 },
  successOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  successCheck: { fontSize: 72 },

  resultPanel: { margin: 16, backgroundColor: '#141414', borderRadius: 20, padding: 18, borderTopWidth: 4, borderTopColor: '#00E5FF', elevation: 10 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultBigIcon: { fontSize: 28 },
  metaLabel: { fontSize: 10, color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  formatText: { fontSize: 15, fontWeight: '700' },
  saveBadge: { backgroundColor: '#1A1A1A', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  saveBadgeText: { fontSize: 11 },
  
  productDetailsBox: {
    backgroundColor: '#0F0F0F',
    borderRadius: 14,
    padding: 16,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#222',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  productInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  productPriceText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 4
  },
  productStockText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
    marginTop: 4
  },

  valueBox: { backgroundColor: '#0F0F0F', borderRadius: 12, padding: 14, marginTop: 12 },
  valueText: { fontSize: 16, color: '#FFF', fontWeight: '500', lineHeight: 24 },
  scanAgainBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  scanAgainText: { fontSize: 16, fontWeight: '800', color: '#0A0A0A' },
  
  alreadyScannedBox: { backgroundColor: '#FFD70020', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#FFD700' },
  alreadyScannedText: { color: '#FFD700', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  
  returnAlertBox: { backgroundColor: '#FF980020', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#FF9800' },
  returnAlertText: { color: '#FF9800', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  
  statusText: { color: '#777', fontSize: 14, textAlign: 'center' },
  bigEmoji: { fontSize: 50 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  permissionBtn: { marginTop: 14, backgroundColor: '#00E5FF', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
  permissionBtnText: { color: '#0A0A0A', fontWeight: '700' },
  ordersBox: { marginTop: 16 },
  orderLinkBtn: { backgroundColor: '#1C1C1E', borderColor: '#444', borderWidth: 1, padding: 12, borderRadius: 10, marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  orderLinkText: { color: '#FFF', fontWeight: '700' },
  orderStatusText: { color: '#00E5FF', fontWeight: '600', textTransform: 'uppercase', fontSize: 12 }
});

export default ScannerScreen;
