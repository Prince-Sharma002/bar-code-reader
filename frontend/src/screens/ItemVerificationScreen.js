import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Vibration, TextInput } from 'react-native';
import { verifyOrderItems, updateOrderStatus, getOrderDetails } from '../services/apiService';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';

const ItemVerificationScreen = () => {
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

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      if (!orderId) {
        Alert.alert('Error', 'No Order ID provided');
        return navigation.goBack();
      }
      
      const resp = await getOrderDetails(orderId);
      if (resp.ok) {
        setOrder(resp.order);
        // Initialize verification check
        verifyItemsLocally(resp.order.items, []);
      }
    } catch (error) {
      console.error('Error fetching order', error);
      Alert.alert('Error', 'Failed to fetch order details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const verifyItemsLocally = async (items, currentScans) => {
    try {
      const resp = await verifyOrderItems(orderId, currentScans);
      if (resp.ok) {
        setVerificationResult(resp);
      }
    } catch (err) {
      console.error('Error verifying items', err);
    }
  };

  const handleBarcodeScanned = async ({ data }) => {
    setIsScanning(false);
    Vibration.vibrate();
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
        Alert.alert('Success', 'Order successfully verified and marked as packed!');
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00E5FF" />
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
          <Text style={styles.scanInstructions}>Point at product barcode</Text>
          <View style={styles.targetBox} />
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsScanning(false)}>
            <Text style={styles.cancelText}>Cancel Scan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backEmoji}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Items</Text>
        <View style={{ width: 40 }}/>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <Text style={styles.orderLabel}>Order {order?.order_number}</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {verificationResult?.verified_count || 0} / {verificationResult?.total_items || order?.items?.length} Verified
            </Text>
            {verificationResult?.all_verified ? (
              <Text style={styles.allDoneBadge}>✅ All Verified</Text>
            ) : null}
          </View>
          
          <TouchableOpacity 
            style={styles.scanItemBtn}
            onPress={async () => {
              if (!permission) {
                await requestPermission();
              }
              setIsScanning(true);
            }}
          >
            <Text style={styles.scanItemBtnText}>📷 Scan Product Barcode</Text>
          </TouchableOpacity>
          
          <View style={styles.manualEntryRow}>
            <TextInput
              style={styles.manualInput}
              placeholder="Or enter barcode manually..."
              placeholderTextColor="#555"
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
              style={styles.manualGoBtn}
              onPress={() => {
                if (manualCode.trim()) {
                  handleBarcodeScanned({ data: manualCode.trim() });
                  setManualCode('');
                }
              }}
            >
              <Text style={styles.manualGoBtnText}>Verify</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Expected Items</Text>
        
        {verificationResult?.verification?.map((item, index) => (
          <View key={index} style={[styles.itemCard, item.verified ? styles.itemVerified : {}]}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
            </View>
            <Text style={styles.itemSku}>SKU: {item.sku}</Text>
            
            <View style={styles.statusRow}>
              {item.verified ? (
                <Text style={styles.verifiedText}>✅ Verified Match</Text>
              ) : (
                <Text style={styles.pendingText}>⏳ Pending Scan</Text>
              )}
            </View>
          </View>
        ))}

        {verificationResult?.extra_scans?.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: '#FF4444', marginTop: 20 }]}>Extra / Unrecognized Scans</Text>
            {verificationResult.extra_scans.map((scan, idx) => (
              <View key={`ex-${idx}`} style={styles.errorCard}>
                <Text style={styles.errorText}>❌ Barcode {scan} does not match any item</Text>
              </View>
            ))}
          </>
        )}
        
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.packBtn, !verificationResult?.all_verified && styles.disabledBtn]} 
          onPress={handleMarkPacked}
          disabled={!verificationResult?.all_verified}
        >
          <Text style={styles.packBtnText}>✅ Mark as Packed</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', paddingTop: 58, paddingHorizontal: 16, 
    paddingBottom: 16, backgroundColor: '#111', 
    alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: '#222'
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  backEmoji: { fontSize: 24, color: '#00E5FF' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  summaryCard: { backgroundColor: '#141414', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#222', marginBottom: 20 },
  orderLabel: { fontSize: 14, color: '#888', marginBottom: 8, fontWeight: '600' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  progressText: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  allDoneBadge: { backgroundColor: '#00E5FF20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: 'hidden', color: '#00E5FF', fontWeight: '800' },
  scanItemBtn: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#00E5FF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  scanItemBtnText: { color: '#00E5FF', fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 12, marginHorizontal: 4 },
  itemCard: { backgroundColor: '#141414', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  itemVerified: { borderColor: '#00E5FF', backgroundColor: '#00E5FF10' },
  
  manualEntryRow: { flexDirection: 'row', marginTop: 16, gap: 10 },
  manualInput: { flex: 1, backgroundColor: '#000', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, color: '#FFF', fontSize: 13, borderWidth: 1, borderColor: '#333' },
  manualGoBtn: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#00E5FF', paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center' },
  manualGoBtnText: { color: '#00E5FF', fontWeight: '800', fontSize: 13 },

  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#FFF', flex: 1, marginRight: 8 },
  itemQty: { fontSize: 16, fontWeight: '700', color: '#00E5FF' },
  itemSku: { fontSize: 12, color: '#888', marginBottom: 12 },
  statusRow: { borderTopWidth: 1, borderTopColor: '#222', paddingTop: 10 },
  verifiedText: { color: '#00E5FF', fontWeight: '700', fontSize: 13 },
  pendingText: { color: '#888', fontWeight: '700', fontSize: 13 },
  errorCard: { backgroundColor: '#2b1010', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#ff4444' },
  errorText: { color: '#ff4444', fontWeight: 'bold' },
  
  // Camera overlay
  scanOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  scanInstructions: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 40 },
  targetBox: { width: 250, height: 150, borderWidth: 2, borderColor: '#00E5FF', borderRadius: 12 },
  cancelBtn: { marginTop: 60, padding: 16, backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  cancelText: { color: '#FFF', fontWeight: 'bold' },

  footer: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    backgroundColor: '#111', padding: 16, borderTopWidth: 1, 
    borderTopColor: '#222', flexDirection: 'row', gap: 12 
  },
  packBtn: { flex: 1, backgroundColor: '#00E5FF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  packBtnText: { color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
  disabledBtn: { backgroundColor: '#333', opacity: 0.7 }
});

export default ItemVerificationScreen;
