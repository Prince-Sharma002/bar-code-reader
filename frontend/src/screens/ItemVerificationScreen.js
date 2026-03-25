import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Vibration, TextInput } from 'react-native';
import { verifyOrderItems, updateOrderStatus, getOrderDetails } from '../services/apiService';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { useTheme } from '../constants/ThemeContext';

const ItemVerificationScreen = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [scannedBarcodes, setScannedBarcodes] = useState([]);
  
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params || {};

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => { fetchOrder(); }, [orderId]);

  const fetchOrder = async () => {
    try {
      if (!orderId) {
        Alert.alert('Error', 'Missing ID');
        return navigation.goBack();
      }
      const resp = await getOrderDetails(orderId);
      if (resp.ok) {
        setOrder(resp.order);
        verifyItemsLocally(resp.order.items, []);
      }
    } catch (err) {
      Alert.alert('Error', 'Fetch failed');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const verifyItemsLocally = async (items, currentScans) => {
    try {
      const resp = await verifyOrderItems(orderId, currentScans);
      if (resp.ok) setVerificationResult(resp);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBarcodeScanned = async ({ data }) => {
    setIsScanning(false);
    Vibration.vibrate(80);
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://raw.githubusercontent.com/fede-87/bar-code-reader/main/frontend/assets/beep.mp3' }
      );
      await sound.playAsync();
    } catch (e) {}

    const updatedScans = [...scannedBarcodes, data];
    setScannedBarcodes(updatedScans);
    verifyItemsLocally(order.items, updatedScans);
  };

  const handleMarkPacked = async () => {
    try {
      setLoading(true);
      const resp = await updateOrderStatus(order._id, 'packed');
      if (resp.ok) {
        Alert.alert('Verified', 'Order manifest confirmed for fulfillment.');
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Error', 'Status update failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (isScanning && permission?.granted) {
    return (
      <View style={styles.container}>
        <CameraView 
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.scanOverlay}>
          <Text style={styles.scanInstructions}>ALIGN BARCODE</Text>
          <View style={styles.targetBox}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsScanning(false)}>
            <Text style={styles.cancelText}>CANCEL SCAN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.summaryCard}>
          <Text style={styles.subLabel}>ORDER #{order?.order_number}</Text>
          <View style={styles.progressRow}>
            <View>
              <Text style={styles.progressTitle}>Package Accuracy</Text>
              <Text style={styles.progressCount}>
                {verificationResult?.verified_count || 0} / {verificationResult?.total_items || order?.items?.length} Verified
              </Text>
            </View>
            <View style={[styles.badge, verificationResult?.all_verified && styles.badgeSuccess]}>
              <Text style={[styles.badgeText, verificationResult?.all_verified && styles.badgeTextSuccess]}>
                {verificationResult?.all_verified ? 'MANIFEST CLEAR' : 'PENDING'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.primaryAction}
            onPress={async () => {
              if (!permission?.granted) await requestPermission();
              setIsScanning(true);
            }}
          >
            <Text style={styles.primaryActionText}>LAUNCH OPTICAL SCAN</Text>
          </TouchableOpacity>
          
          <View style={styles.manualEntry}>
            <TextInput
              style={styles.manualInput}
              placeholder="Manual SKU/Barcode..."
              placeholderTextColor={theme.textMuted}
              value={manualCode}
              onChangeText={setManualCode}
              onSubmitEditing={() => {
                if (manualCode.trim()) {
                  handleBarcodeScanned({ data: manualCode.trim() });
                  setManualCode('');
                }
              }}
            />
            <TouchableOpacity 
              style={styles.manualBtn}
              onPress={() => {
                if (manualCode.trim()) {
                  handleBarcodeScanned({ data: manualCode.trim() });
                  setManualCode('');
                }
              }}
            >
              <Text style={styles.manualBtnText}>SYNC</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Manifest Checklist</Text>
        
        {verificationResult?.verification?.map((item, index) => (
          <View key={index} style={[styles.itemCard, item.verified && styles.itemCardSuccess]}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
            </View>
            <View style={styles.itemFooter}>
              <Text style={styles.itemSku}>SKU: {item.sku}</Text>
              <Text style={[styles.statusTag, item.verified && { color: theme.order }]}>
                {item.verified ? 'VERIFIED Match • ⬢' : 'Awaiting Scan • ⬡'}
              </Text>
            </View>
          </View>
        ))}

        {verificationResult?.extra_scans?.length > 0 && (
          <>
            <Text style={styles.errorTitle}>Unidentified Scans</Text>
            {verificationResult.extra_scans.map((scan, idx) => (
              <View key={`ex-${idx}`} style={styles.errorCard}>
                <Text style={styles.errorText}>◿ Barcode {scan} not in manifest</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.finalizeBtn, !verificationResult?.all_verified && styles.finalizeBtnDisabled]} 
          onPress={handleMarkPacked}
          disabled={!verificationResult?.all_verified}
        >
          <Text style={styles.finalizeBtnText}>CONFIRM & FINALIZE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centered: { flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 24, paddingBottom: 120 },
  summaryCard: { backgroundColor: theme.surface, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: theme.border, marginBottom: 32 },
  subLabel: { fontSize: 10, color: theme.textMuted, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  progressTitle: { fontSize: 13, color: theme.textSecondary, fontWeight: '700', marginBottom: 4 },
  progressCount: { fontSize: 28, fontWeight: '800', color: theme.text },
  badge: { backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
  badgeSuccess: { backgroundColor: `${theme.order}15`, borderColor: `${theme.order}40` },
  badgeText: { fontSize: 9, fontWeight: '900', color: theme.textMuted, letterSpacing: 0.5 },
  badgeTextSuccess: { color: theme.order },
  primaryAction: { backgroundColor: theme.primary, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryActionText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  manualEntry: { flexDirection: 'row', marginTop: 16, gap: 12 },
  manualInput: { flex: 1, backgroundColor: theme.isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)', borderRadius: 14, paddingHorizontal: 16, color: theme.text, fontSize: 14, borderWidth: 1, borderColor: theme.border, height: 48 },
  manualBtn: { backgroundColor: theme.surfaceElevated, paddingHorizontal: 20, borderRadius: 14, justifyContent: 'center', borderWidth: 1, borderColor: theme.primary },
  manualBtnText: { color: theme.primary, fontWeight: '900', fontSize: 11 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: theme.text, marginBottom: 16, marginLeft: 4 },
  itemCard: { backgroundColor: theme.surface, padding: 20, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  itemCardSuccess: { borderColor: `${theme.order}30`, backgroundColor: `${theme.order}05` },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemName: { fontSize: 15, fontWeight: '700', color: theme.text, flex: 1, marginRight: 8 },
  itemQty: { fontSize: 18, fontWeight: '800', color: theme.primary },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemSku: { fontSize: 11, color: theme.textMuted, fontWeight: '700' },
  statusTag: { fontSize: 11, fontWeight: '800', color: theme.textMuted },
  errorTitle: { fontSize: 14, fontWeight: '800', color: theme.error, marginTop: 16, marginBottom: 12, marginLeft: 4 },
  errorCard: { backgroundColor: `${theme.error}10`, padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: `${theme.error}30` },
  errorText: { color: theme.error, fontWeight: '800', fontSize: 13 },
  scanOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' },
  scanInstructions: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 2, marginBottom: 40 },
  targetBox: { width: 280, height: 280, borderRadius: 32 },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: theme.primary, borderWidth: 6 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 24 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 24 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 24 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 24 },
  cancelBtn: { marginTop: 60, height: 56, paddingHorizontal: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  cancelText: { color: '#FFF', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.background, padding: 24, borderTopWidth: 1, borderTopColor: theme.border },
  finalizeBtn: { backgroundColor: theme.primary, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  finalizeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  finalizeBtnDisabled: { backgroundColor: theme.surfaceElevated, opacity: 0.5 }
});

export default ItemVerificationScreen;

