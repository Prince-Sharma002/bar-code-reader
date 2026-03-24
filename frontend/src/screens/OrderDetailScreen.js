import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { getOrderDetails, updateOrderStatus } from '../services/apiService';
import { useNavigation, useRoute } from '@react-navigation/native';
import Colors from '../constants/Colors';

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
      if (resp.ok) setOrder(resp.order);
      else {
        Alert.alert('Error', 'Order not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
    const sub = navigation.addListener('focus', fetchOrderDetails);
    return sub;
  }, [orderId, navigation]);

  const handleMarkPacked = async () => {
    try {
      setLoading(true);
      const resp = await updateOrderStatus(order._id, 'packed');
      if (resp.ok) {
        setOrder(resp.order);
      } else {
        Alert.alert(
          'Verification Required', 
          resp.message || 'Complete item verification first.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Verify Now', onPress: () => navigation.navigate('ItemVerification', { orderId: order._id }) }
          ]
        );
      }
    } catch(err) {
      Alert.alert('Error', 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'packed': case 'delivered': case 'ready_to_ship': return Colors.order;
      case 'pending': return Colors.duplicate;
      case 'returned': return Colors.return;
      case 'processing': return Colors.product;
      default: return Colors.textMuted;
    }
  };

  if (loading && !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!order) return null;

  const sCol = getStatusColor(order.status);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>◂</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Ticket</Text>
        <View style={{ width: 44 }}/>
      </View>
      
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.mainCard}>
          <View style={styles.ticketHeader}>
            <View>
              <Text style={styles.label}>ORDER ID</Text>
              <Text style={styles.orderId}>#{order.order_number}</Text>
            </View>
            <View style={[styles.statusBadge, { borderColor: `${sCol}40`, backgroundColor: `${sCol}10` }]}>
              <Text style={[styles.statusText, { color: sCol }]}>{order.status.replace(/_/g, ' ').toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.label}>PLATFORM</Text>
              <Text style={styles.metaValue}>{order.platform.toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.label}>PLACED AT</Text>
              <Text style={styles.metaValue}>{new Date(order.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.label}>LOGISTICS & ADDRESS</Text>
          <Text style={styles.customerName}>{order.customer?.name}</Text>
          <Text style={styles.customerAddr}>{order.customer?.address}</Text>
          <Text style={styles.customerPhone}>{order.customer?.phone}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.label}>MANIFEST ({order.items?.length || 0} ITEMS)</Text>
        </View>
        
        {order.items?.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.itemFooter}>
              <Text style={styles.itemSku}>SKU: {item.sku}</Text>
              <View style={styles.qtyBox}>
                <Text style={styles.qtyText}>x{item.quantity}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.altBtn} 
          onPress={() => navigation.navigate('ItemVerification', { orderId: order._id })}
        >
          <Text style={styles.altBtnText}>SCAN ITEMS</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.primaryBtn, 
            ['packed', 'ready_to_ship', 'handed_to_courier', 'delivered', 'returned'].includes(order.status) && styles.primaryBtnDisabled
          ]} 
          onPress={handleMarkPacked}
          disabled={['packed', 'ready_to_ship', 'handed_to_courier', 'delivered', 'returned'].includes(order.status)}
        >
          <Text style={styles.primaryBtnText}>
            {order.status === 'pending' ? (order.is_verified ? 'FINALIZE PACKAGE' : 'PENDING SCAN') : 'ORDER UPDATED'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', paddingTop: 64, paddingHorizontal: 20, 
    paddingBottom: 20, alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: Colors.border
  },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  backIcon: { fontSize: 20, color: Colors.textSecondary },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, letterSpacing: 1 },
  scroll: { padding: 24, paddingBottom: 120 },
  mainCard: { backgroundColor: Colors.surface, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: Colors.border },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  label: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 8 },
  orderId: { fontSize: 22, fontWeight: '800', color: Colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', gap: 40, marginBottom: 24 },
  metaValue: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  divider: { height: 1.5, backgroundColor: Colors.border, marginVertical: 24, borderStyle: 'dashed' },
  customerName: { fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  customerAddr: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 4 },
  customerPhone: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  sectionHeader: { marginTop: 32, marginBottom: 16, paddingHorizontal: 4 },
  itemCard: { backgroundColor: Colors.surface, padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  itemName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemSku: { fontSize: 11, color: Colors.textMuted, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  qtyBox: { backgroundColor: `${Colors.primary}15`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  qtyText: { fontSize: 14, fontWeight: '900', color: Colors.primary },
  footer: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    backgroundColor: Colors.background, padding: 24, borderTopWidth: 1, 
    borderTopColor: Colors.border, flexDirection: 'row', gap: 12 
  },
  altBtn: { flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  altBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  primaryBtn: { flex: 1.5, backgroundColor: Colors.primary, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: Colors.background, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  primaryBtnDisabled: { backgroundColor: Colors.surfaceElevated, opacity: 0.5 }
});

export default OrderDetailScreen;
