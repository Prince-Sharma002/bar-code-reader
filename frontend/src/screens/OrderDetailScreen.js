import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { getOrderDetails, updateOrderStatus } from '../services/apiService';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../constants/ThemeContext';

const OrderDetailScreen = () => {
  const { theme } = useTheme();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params || {};

  const styles = useMemo(() => createStyles(theme), [theme]);

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
      case 'packed': case 'delivered': case 'ready_to_ship': return theme.order;
      case 'pending': return theme.duplicate;
      case 'returned': return theme.return;
      case 'processing': return theme.product;
      default: return theme.textMuted;
    }
  };

  if (loading && !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!order) return null;

  const sCol = getStatusColor(order.status);

  return (
    <View style={styles.container}>
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

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centered: { flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 24, paddingBottom: 120 },
  mainCard: { backgroundColor: theme.surface, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: theme.border },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  label: { fontSize: 10, fontWeight: '800', color: theme.textMuted, letterSpacing: 1.5, marginBottom: 8 },
  orderId: { fontSize: 22, fontWeight: '800', color: theme.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', gap: 40, marginBottom: 24 },
  metaValue: { fontSize: 14, fontWeight: '700', color: theme.textSecondary },
  divider: { height: 1.5, backgroundColor: theme.border, marginVertical: 24, borderStyle: 'dashed' },
  customerName: { fontSize: 17, fontWeight: '800', color: theme.text, marginBottom: 6 },
  customerAddr: { fontSize: 13, color: theme.textSecondary, lineHeight: 20, marginBottom: 4 },
  customerPhone: { fontSize: 13, color: theme.primary, fontWeight: '700' },
  sectionHeader: { marginTop: 32, marginBottom: 16, paddingHorizontal: 4 },
  itemCard: { backgroundColor: theme.surface, padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  itemName: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 12 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemSku: { fontSize: 11, color: theme.textMuted, fontWeight: '700', backgroundColor: theme.isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  qtyBox: { backgroundColor: `${theme.primary}15`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  qtyText: { fontSize: 14, fontWeight: '900', color: theme.primary },
  footer: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    backgroundColor: theme.background, padding: 24, borderTopWidth: 1, 
    borderTopColor: theme.border, flexDirection: 'row', gap: 12 
  },
  altBtn: { flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  altBtnText: { color: theme.textSecondary, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  primaryBtn: { flex: 1.5, backgroundColor: theme.primary, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  primaryBtnDisabled: { backgroundColor: theme.surfaceElevated, opacity: 0.5 }
});

export default OrderDetailScreen;

