import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Alert,
} from 'react-native';
// SDK 54: Use CameraView + useCameraPermissions from expo-camera
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { storeScan, lookupOrderBarcode } from '../services/apiService';

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
  const [torch, setTorch] = useState(false); // Flashlight state
  const [alreadyScannedAlert, setAlreadyScannedAlert] = useState(false);
  const [foundOrders, setFoundOrders] = useState([]);
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
      const storeRes = storeScan(data, format, Device.deviceName || 'Unknown Device', latitude, longitude);
      const lookupRes = lookupOrderBarcode(data);
      
      const [result, orderResult] = await Promise.all([storeRes, lookupRes].map(p => p.catch(e => e)));
      
      if (result && !result.message?.includes('Network') && !result.message?.includes('failed')) {
         if (result?.alreadyScanned) {
            setAlreadyScannedAlert(true);
         }
      }

      // Check if lookup returned an order
      if (orderResult && orderResult.ok && orderResult.orders && orderResult.orders.length > 0) {
        setFoundOrders(orderResult.orders);
        // Provide haptic feedback for success
        Vibration.vibrate([100, 100, 100]);
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
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
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
        </View>
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
                    { transform: [{ translateY: scanLineAnim }] },
                  ]}
                />
              )}

              {scanned && (
                <View style={styles.successOverlay}>
                  <Text style={styles.successCheck}>✓</Text>
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
            <Text style={styles.resultBigIcon}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaLabel}>Format</Text>
              <Text style={styles.formatText}>{scanResult.format}</Text>
            </View>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>
                {isSaving ? '⏳ Saving…' : '✅ Saved'}
              </Text>
            </View>
          </View>

          <View style={styles.valueBox}>
            <Text style={styles.metaLabel}>Scanned Value</Text>
            <Text style={styles.valueText} selectable numberOfLines={4}>
              {scanResult.value}
            </Text>
          </View>

          {alreadyScannedAlert && (
            <View style={styles.alreadyScannedBox}>
              <Text style={styles.alreadyScannedText}>⚠️ This barcode was already scanned recently!</Text>
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

          <TouchableOpacity style={styles.scanAgainBtn} onPress={handleScanAgain}>
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
  torchIcon: { fontSize: 22 },

  cameraWrap: { marginHorizontal: 16, borderRadius: 22, overflow: 'hidden', height: 380, borderWidth: 1, borderColor: '#1E1E1E' },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: FRAME, height: FRAME, overflow: 'hidden' },
  
  corner: { position: 'absolute', width: 26, height: 26, borderColor: '#00E5FF', borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  
  scanLine: { position: 'absolute', left: 4, right: 4, height: 2, backgroundColor: '#00E5FF', shadowColor: '#00E5FF', shadowOpacity: 1, shadowRadius: 10 },
  successOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,229,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  successCheck: { fontSize: 72, color: '#00E5FF' },

  resultPanel: { margin: 16, backgroundColor: '#141414', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#222' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultBigIcon: { fontSize: 28 },
  metaLabel: { fontSize: 10, color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  formatText: { fontSize: 15, fontWeight: '700', color: '#00E5FF' },
  saveBadge: { backgroundColor: '#1A1A1A', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#2A2A2A' },
  saveBadgeText: { fontSize: 11, color: '#AAA' },
  valueBox: { backgroundColor: '#0F0F0F', borderRadius: 12, padding: 14, marginTop: 12 },
  valueText: { fontSize: 16, color: '#FFF', fontWeight: '500', lineHeight: 24 },
  scanAgainBtn: { backgroundColor: '#00E5FF', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  scanAgainText: { fontSize: 15, fontWeight: '700', color: '#0A0A0A' },
  
  alreadyScannedBox: { backgroundColor: '#FFD70020', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#FFD700' },
  alreadyScannedText: { color: '#FFD700', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  
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
