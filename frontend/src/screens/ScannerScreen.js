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
  Platform,
  ActivityIndicator
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { storeScan, lookupOrderBarcode, lookupProduct } from '../services/apiService';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../constants/Colors';

const BARCODE_TYPES = [
  'qr', 'ean13', 'ean8', 'code128', 'code39', 'code93',
  'upc_a', 'upc_e', 'pdf417', 'aztec', 'datamatrix', 'itf14',
];

const ScannerScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [torch, setTorch] = useState(false);
  const [foundOrders, setFoundOrders] = useState([]);
  const [foundProduct, setFoundProduct] = useState(null);
  const [scanType, setScanType] = useState('unknown');
  const navigation = useNavigation();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const webVideoRef = useRef(null);
  const zxingReaderRef = useRef(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let isMounted = true;
    const startWebScanner = async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/library');
        const reader = new BrowserMultiFormatReader();
        zxingReaderRef.current = reader;
        const checkVideo = () => new Promise(r => {
          const c = () => webVideoRef.current ? r() : setTimeout(c, 100);
          c();
        });
        await checkVideo();
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        reader.decodeFromVideoDevice(devices[0]?.deviceId, webVideoRef.current, (result) => {
          if (isMounted && result && !scannedRef.current) {
            handleBarcodeScanned({ type: 'QR_CODE', data: result.getText() });
          }
        });
      } catch (e) { console.warn(e); }
    };
    startWebScanner();
    return () => {
      isMounted = false;
      if (zxingReaderRef.current) zxingReaderRef.current.reset();
    };
  }, []);

  useEffect(() => { scannedRef.current = scanned; }, [scanned]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 220, duration: 2500, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const playBeep = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync({ 
        uri: 'https://raw.githubusercontent.com/fede-87/bar-code-reader/main/frontend/assets/beep.mp3' 
      });
      await sound.playAsync();
    } catch { Vibration.vibrate(80); }
  };

  const handleBarcodeScanned = async ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    Vibration.vibrate(80);
    playBeep();

    const format = type?.toUpperCase() || 'UNKNOWN';
    setScanResult({ value: data, format });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    setIsSaving(true);
    try {
      const resp = await storeScan(data, format, Device.deviceName || 'Device', null, null, 'unknown');
      const orderRes = await lookupOrderBarcode(data).catch(() => null);
      if (orderRes?.ok && orderRes.orders?.length > 0) {
        setFoundOrders(orderRes.orders);
        setScanType(orderRes.type || 'order');
      } else {
        const prodRes = await lookupProduct(data).catch(() => null);
        if (prodRes?.ok && prodRes.product) {
          setFoundProduct(prodRes.product);
          setScanType('product');
        } else {
          setScanType('unknown');
        }
      }
    } catch (err) { 
      console.warn('Scan processing error:', err);
      setScanType('unknown'); 
    }
    finally { setIsSaving(false); }
  };

  const resetScanner = () => {
    setScanned(false);
    scannedRef.current = false;
    setScanResult(null);
    setFoundOrders([]);
    setFoundProduct(null);
    setScanType('unknown');
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
  };

  const handleOpenGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets[0]) {
      resetScanner();
      setIsSaving(true);
      if (Platform.OS === 'web') {
         Alert.alert('Gallery Scan', 'Scanning from gallery is currently only supported on the mobile app or via live camera.');
      } else {
         Alert.alert('Gallery Scan', 'Feature coming soon to this version. Please use live camera.');
      }
      setIsSaving(false);
    }
  };

  if (!permission) return (
    <View style={styles.centered}>
      <ActivityIndicator color={Colors.primary} />
    </View>
  );

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <View style={styles.lockBox}>
          <Text style={styles.lockIcon}>◔</Text>
          <Text style={styles.errorTitle}>Optical Access Locked</Text>
          <Text style={styles.statusText}>
            Camera permission is required. 
            {"\n\n"}
            <Text style={{ opacity: 0.6 }}>Note: Use HTTPS for web camera access.</Text>
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>ACTIVATE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerLabel}>Active Hub</Text>
          <Text style={styles.headerTitle}>Optical Reader</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.smallAction, torch && styles.smallActionActive]} 
            onPress={() => setTorch(!torch)}
          >
            <Text style={[styles.actionEmoji, torch && { color: Colors.primary }]}>{torch ? '⏻' : '⏼'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallAction} onPress={handleOpenGallery}>
            <Text style={styles.actionEmoji}>◖</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.manualEntry}>
        <TextInput
          style={styles.manualInput}
          placeholder="Manual input..."
          placeholderTextColor={Colors.textMuted}
          value={manualCode}
          onChangeText={setManualCode}
          onSubmitEditing={() => manualCode.trim() && handleBarcodeScanned({ data: manualCode.trim(), type: 'MANUAL' })}
        />
        <TouchableOpacity 
          style={styles.manualBtn}
          onPress={() => manualCode.trim() && handleBarcodeScanned({ data: manualCode.trim(), type: 'MANUAL' })}
        >
          <Text style={styles.manualBtnText}>GO</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.viewfinderContainer}>
        <View style={styles.viewfinder}>
          {Platform.OS === 'web' ? (
            <video ref={webVideoRef} style={styles.webVideo} muted playsInline autoPlay />
          ) : (
            <CameraView 
              style={styles.cameraView} 
              facing="back" 
              enableTorch={torch} 
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
            />
          )}
          
          <View style={styles.scannerOverlay}>
            <View style={styles.scanTarget}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
              
              {!scanned && (
                <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineAnim }] }]} />
              )}
            </View>
          </View>
        </View>
      </View>

      {scanResult && (
        <Animated.View style={[styles.resultPanel, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.resultHeader}>
            <View style={[styles.typeIconBox, { backgroundColor: `${Colors[scanType] || Colors.primary}15` }]}>
              <Text style={{ fontSize: 24, color: Colors[scanType] || Colors.primary }}>
                {scanType === 'return' ? '↩' : scanType === 'product' ? '◱' : '◎'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaLabel}>{scanType.toUpperCase()}</Text>
              <Text style={styles.resultMainText}>
                {scanType === 'product' ? foundProduct?.name : scanResult.value}
              </Text>
            </View>
            <View style={[styles.statusBadge, { borderColor: `${Colors[scanType] || Colors.primary}40` }]}>
              <Text style={[styles.statusBadgeText, { color: Colors[scanType] || Colors.primary }]}>
                {isSaving ? 'SYNCING' : 'VERIFIED'}
              </Text>
            </View>
          </View>

          {foundOrders.length > 0 && (
            <View style={styles.orderList}>
              {foundOrders.map(order => (
                <TouchableOpacity 
                  key={order._id} 
                  style={styles.orderItem}
                  onPress={() => navigation.navigate('OrderDetail', { orderId: order._id })}
                >
                  <Text style={styles.orderItemText}>Order #{order.order_number}</Text>
                  <Text style={styles.orderItemLink}>VIEW ↗</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.resetBtn} onPress={resetScanner}>
            <Text style={styles.resetBtnText}>SCAN NEXT ⬡</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 },
  
  header: { 
    paddingTop: 64, paddingHorizontal: 24, paddingBottom: 20, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' 
  },
  headerLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.text, marginTop: 4 },
  headerActions: { flexDirection: 'row', gap: 12 },
  smallAction: { 
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.surface, 
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' 
  },
  smallActionActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}10` },
  actionEmoji: { fontSize: 20, color: Colors.textSecondary },

  manualEntry: { 
    flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 24, 
    backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border
  },
  manualInput: { 
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, paddingHorizontal: 16, 
    height: 48, color: Colors.text, fontSize: 13, fontWeight: '700', borderWidth: 1, borderColor: `${Colors.border}80`
  },
  manualBtn: { 
    backgroundColor: Colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 20, 
    justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary
  },
  manualBtnText: { color: Colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  viewfinderContainer: { paddingHorizontal: 24, paddingBottom: 24, flex: 1 },
  viewfinder: { 
    aspectRatio: 0.9,
    borderRadius: 32, 
    overflow: 'hidden', 
    backgroundColor: '#000', 
    borderWidth: 1, 
    borderColor: Colors.border,
    justifyContent: 'center'
  },
  webVideo: { width: '100%', height: '100%', objectFit: 'cover' },
  cameraView: { flex: 1 },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  scanTarget: { width: 220, height: 220 },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: Colors.primary, borderWidth: 5 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 16 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 16 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 16 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 16 },
  scanLine: { 
    position: 'absolute', left: 10, right: 10, height: 3, 
    backgroundColor: Colors.primary, 
    shadowColor: Colors.primary, 
    shadowOpacity: 1, 
    shadowRadius: 15,
    elevation: 5
  },

  resultPanel: { 
    position: 'absolute', bottom: 30, left: 24, right: 24, 
    backgroundColor: Colors.surface, borderRadius: 24, padding: 20, 
    borderWidth: 1, borderColor: Colors.border, elevation: 12 
  },
  resultHeader: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  typeIconBox: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  metaLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1 },
  resultMainText: { fontSize: 16, fontWeight: '800', color: Colors.text, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  
  orderList: { marginTop: 16, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16, gap: 10 },
  orderItem: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    backgroundColor: Colors.surfaceElevated, padding: 12, borderRadius: 12 
  },
  orderItemText: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  orderItemLink: { color: Colors.primary, fontSize: 11, fontWeight: '800' },

  resetBtn: { 
    backgroundColor: Colors.primary, borderRadius: 16, height: 56, 
    alignItems: 'center', justifyContent: 'center', marginTop: 20 
  },
  resetBtnText: { color: Colors.background, fontSize: 15, fontWeight: '800' },

  lockBox: { alignItems: 'center', padding: 24 },
  lockIcon: { fontSize: 64, color: Colors.border, marginBottom: 16 },
  permissionBtn: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  permissionBtnText: { color: Colors.background, fontWeight: '900', fontSize: 14 },
  statusText: { color: Colors.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 20 }
});

export default ScannerScreen;
