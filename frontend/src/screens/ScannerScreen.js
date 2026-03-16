import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Alert,
  Linking,
} from 'react-native';
// SDK 54: Use CameraView + useCameraPermissions from expo-camera
// expo-barcode-scanner is DEPRECATED in SDK 54
import { CameraView, useCameraPermissions } from 'expo-camera';
import { storeScan } from '../services/apiService';

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
  // SDK 54 permission hook — cleaner than the old requestPermissionsAsync pattern
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

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

  /**
   * Called by CameraView when a barcode enters the viewfinder.
   * The `scanned` flag prevents duplicate triggers while paused.
   */
  const handleBarcodeScanned = async ({ type, data }) => {
    if (scanned) return;

    setScanned(true);
    Vibration.vibrate(80);

    const format = normalizeFormat(type);
    setScanResult({ value: data, format });

    // Slide result panel up
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();

    // Persist to backend
    setIsSaving(true);
    try {
      await storeScan(data, format);
    } catch {
      Alert.alert(
        '⚠️ Save Failed',
        'Scan detected but not saved to server.\n\nMake sure:\n• Backend is running (npm run dev)\n• IP address in apiService.js is correct (run ipconfig to find it)',
        [{ text: 'OK' }]
      );
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
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
  };

  // ── Permission not yet determined ──
  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.statusText}>📷 Loading camera...</Text>
      </View>
    );
  }

  // ── Permission denied ──
  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.bigEmoji}>🚫</Text>
        <Text style={styles.errorTitle}>Camera Access Required</Text>
        <Text style={styles.statusText}>
          Camera permission is needed to scan barcodes.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        {/* In case user denied permanently */}
        <TouchableOpacity onPress={() => Linking.openSettings()}>
          <Text style={styles.settingsLink}>Open Device Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ── Top Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📷 Barcode Scanner</Text>
        <Text style={styles.headerSub}>
          {scanned ? 'Scan complete!' : 'Align barcode within the frame'}
        </Text>
      </View>

      {/* ── Camera Viewfinder ── */}
      <View style={styles.cameraWrap}>
        <CameraView
          style={styles.camera}
          facing="back"
          // Pass undefined when scanned to pause scanning
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
        >
          {/* Semi-transparent overlay with scan frame cutout */}
          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              {/* Cyan corner brackets */}
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />

              {/* Animated laser line — only when not scanned */}
              {!scanned && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanLineAnim }] },
                  ]}
                />
              )}

              {/* Success overlay when scan completes */}
              {scanned && (
                <View style={styles.successOverlay}>
                  <Text style={styles.successCheck}>✓</Text>
                </View>
              )}
            </View>
          </View>
        </CameraView>
      </View>

      {/* ── Scan Result Panel ── */}
      {scanResult ? (
        <Animated.View
          style={[
            styles.resultPanel,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Format + Save status row */}
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

          {/* Barcode value display */}
          <View style={styles.valueBox}>
            <Text style={styles.metaLabel}>Scanned Value</Text>
            <Text style={styles.valueText} selectable numberOfLines={4}>
              {scanResult.value}
            </Text>
          </View>

          {/* Reset button */}
          <TouchableOpacity style={styles.scanAgainBtn} onPress={handleScanAgain}>
            <Text style={styles.scanAgainText}>📷  Scan Another</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <View style={styles.hintsBox}>
          <Text style={styles.hintsTitle}>Supported Formats</Text>
          <Text style={styles.hintsText}>QR Code • EAN-13 • EAN-8 • Code 128 • Code 39 • UPC-A • UPC-E • PDF-417 • Aztec</Text>
        </View>
      )}
    </View>
  );
};

const FRAME = 230;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  centered: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
  },

  // ── Header
  header: {
    paddingTop: 58,
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
  },

  // ── Camera
  cameraWrap: {
    marginHorizontal: 16,
    borderRadius: 22,
    overflow: 'hidden',
    height: 370,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  camera: { flex: 1 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scanFrame: {
    width: FRAME,
    height: FRAME,
    overflow: 'hidden',
  },

  // Cyan corner brackets
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#00E5FF',
    borderWidth: 3,
  },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },

  // Laser line
  scanLine: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 2,
    backgroundColor: '#00E5FF',
    borderRadius: 2,
    shadowColor: '#00E5FF',
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },

  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,229,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCheck: {
    fontSize: 72,
    color: '#00E5FF',
  },

  // ── Result Panel
  resultPanel: {
    margin: 16,
    backgroundColor: '#141414',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#222',
    gap: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultBigIcon: { fontSize: 28 },
  metaLabel: {
    fontSize: 10,
    color: '#555',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  formatText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00E5FF',
  },
  saveBadge: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  saveBadgeText: { fontSize: 11, color: '#AAA' },

  valueBox: {
    backgroundColor: '#0F0F0F',
    borderRadius: 12,
    padding: 14,
  },
  valueText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
    lineHeight: 24,
    marginTop: 4,
  },

  scanAgainBtn: {
    backgroundColor: '#00E5FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scanAgainText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A0A0A',
    letterSpacing: 0.3,
  },

  // ── Hints (shown before first scan)
  hintsBox: {
    margin: 16,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  hintsTitle: {
    fontSize: 12,
    color: '#444',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hintsText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },

  // ── Permission screen
  bigEmoji: { fontSize: 50 },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  statusText: {
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionBtn: {
    marginTop: 4,
    backgroundColor: '#00E5FF',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
  },
  permissionBtnText: {
    color: '#0A0A0A',
    fontWeight: '700',
    fontSize: 15,
  },
  settingsLink: {
    color: '#444',
    fontSize: 13,
    marginTop: 8,
    textDecorationLine: 'underline',
  },
});

export default ScannerScreen;
