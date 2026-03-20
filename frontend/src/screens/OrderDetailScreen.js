import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { getOrderDetails, updateOrderStatus } from '../services/apiService';
import { useNavigation, useRoute } from '@react-navigation/native';

const OrderDetailScreen = () => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const route = useRoute();
  
  const { orderId } = route.params || {};

  const fetchOrderDetails = async () => {
    try {
      if (!orderId) {
        Alert.alert('Error', 'No Order ID provided');
        return navigation.goBack();
      }
      
      const resp = await getOrderDetails(orderId);
      if (resp.ok) {
        setOrder(resp.order);
      } else {
        Alert.alert('Error', 'Order not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching order', error);
      Alert.alert('Error', 'Failed to fetch order details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
    
    // Refresh when screen is focused (e.g. returning from verification)
    const unsubscribe = navigation.addListener('focus', fetchOrderDetails);
    
    return unsubscribe;
  }, [orderId, navigation]);

  const handleMarkPacked = async () => {
    try {
      setLoading(true);
      const resp = await updateOrderStatus(order._id, 'packed');
      if (resp.ok) {
        setOrder(resp.order);
        Alert.alert('Success', 'Order marked as packed');
      } else {
        // Handle unverified case
        Alert.alert(
          'Verification Required', 
          resp.message || 'You must verify all items in this order before marking it as packed.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Verify Now', onPress: () => navigation.navigate('ItemVerification', { orderId: order._id }) }
          ]
        );
      }
    } catch(err) {
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

  if (!order) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backEmoji}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 40 }}/>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.label}>ORDER NUMBER</Text>
          <Text style={styles.value}>{order.order_number}</Text>
          
          <Text style={styles.label}>STATUS</Text>
          <View style={styles.statusBadgeWrap}>
            <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
          </View>
          
          <Text style={styles.label}>PLATFORM</Text>
          <Text style={styles.value}>{order.platform}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.label}>CUSTOMER INFO</Text>
          <Text style={styles.textValue}>Name: {order.customer?.name}</Text>
          <Text style={styles.textValue}>Phone: {order.customer?.phone}</Text>
          <Text style={styles.textValue}>Address: {order.customer?.address}</Text>
        </View>

        <Text style={styles.sectionTitle}>Items ({order.items?.length || 0})</Text>
        
        {order.items?.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.itemRow}>
              <Text style={styles.itemSku}>SKU: {item.sku}</Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.verifyBtn} 
          onPress={() => navigation.navigate('ItemVerification', { orderId: order._id })}
        >
          <Text style={styles.verifyBtnText}>📷 Verify Items</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.packBtn, 
            order.status === 'packed' && styles.disabledBtn,
            !order.is_verified && order.status !== 'packed' && styles.unverifiedBtn
          ]} 
          onPress={handleMarkPacked}
          disabled={order.status === 'packed'}
        >
          <Text style={[styles.packBtnText, !order.is_verified && order.status !== 'packed' && styles.unverifiedBtnText]}>
            {order.status === 'packed' ? '✅ Packed' : (order.is_verified ? 'Mark as Packed' : 'Verify Items First')}
          </Text>
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
  card: { backgroundColor: '#141414', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#222' },
  label: { fontSize: 11, fontWeight: '700', color: '#777', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  value: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  textValue: { fontSize: 14, color: '#CCC', marginTop: 4 },
  statusBadgeWrap: { backgroundColor: '#00E5FF20', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#00E5FF' },
  statusText: { color: '#00E5FF', fontWeight: '800', fontSize: 11 },
  divider: { height: 1, backgroundColor: '#222', marginVertical: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginTop: 24, marginBottom: 12, marginHorizontal: 4 },
  itemCard: { backgroundColor: '#141414', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#FFF', marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemSku: { fontSize: 12, color: '#888', backgroundColor: '#1A1A1A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  itemQty: { fontSize: 16, fontWeight: '700', color: '#00E5FF' },
  footer: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    backgroundColor: '#111', padding: 16, borderTopWidth: 1, 
    borderTopColor: '#222', flexDirection: 'row', gap: 12 
  },
  verifyBtn: { flex: 1, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  verifyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  packBtn: { flex: 1.5, backgroundColor: '#00E5FF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  packBtnText: { color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
  disabledBtn: { backgroundColor: '#333', opacity: 0.7 },
  unverifiedBtn: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333' },
  unverifiedBtnText: { color: '#888' }
});

export default OrderDetailScreen;
