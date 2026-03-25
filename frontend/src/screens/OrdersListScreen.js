import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { getOrders } from '../services/apiService';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../constants/ThemeContext';

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Ready', value: 'ready_to_ship' },
  { label: 'Packed', value: 'packed' },
  { label: 'Shipped', value: 'handed_to_courier' },
  { label: 'Delivered', value: 'delivered' },
];

const OrdersListScreen = () => {
  const { theme } = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const navigation = useNavigation();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const fetchOrders = async () => {
    try {
      const resp = await getOrders();
      if (resp.ok) setOrders(resp.orders);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const sub = navigation.addListener('focus', fetchOrders);
    return sub;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const ms = o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 (o.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const mt = activeStatus === 'all' || o.status === activeStatus;
      return ms && mt;
    });
  }, [orders, searchQuery, activeStatus]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'packed': case 'delivered': case 'ready_to_ship': return theme.order;
      case 'pending': return theme.duplicate;
      case 'returned': return theme.return;
      case 'processing': return theme.product;
      default: return theme.textMuted;
    }
  };

  const renderItem = ({ item }) => {
    const sCol = getStatusColor(item.status);
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderNumber}>#{item.order_number}</Text>
          <View style={[styles.statusBadge, { borderColor: `${sCol}30`, backgroundColor: `${sCol}10` }]}>
            <Text style={[styles.statusText, { color: sCol }]}>{item.status.replace(/_/g, ' ').toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.customerName}>{item.customer?.name || 'Unknown Customer'}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.itemCount}>⬡ {item.items?.length || 0} ITEMS</Text>
          <Text style={styles.platform}>{item.platform.toUpperCase()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerSub}>FULFILLMENT CENTER</Text>
            <Text style={styles.headerTitle}>Order Queue</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filteredOrders.length}</Text>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⚲</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID or name..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          {STATUS_FILTERS.map(f => (
            <TouchableOpacity
              key={f.value}
              style={[styles.chip, activeStatus === f.value && styles.chipActive]}
              onPress={() => setActiveStatus(f.value)}
            >
              <Text style={[styles.chipText, activeStatus === f.value && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <FlatList
        data={filteredOrders}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>◰</Text>
            <Text style={styles.emptyTitle}>Queue Clear</Text>
            <Text style={styles.emptyText}>No matching orders found in your current selection.</Text>
          </View>
        }
      />
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centered: { flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  headerSub: { fontSize: 10, fontWeight: '800', color: theme.textMuted, letterSpacing: 1.5 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: theme.text, marginTop: 4 },
  countBadge: { 
    backgroundColor: theme.surface, paddingHorizontal: 12, paddingVertical: 6, 
    borderRadius: 12, borderWidth: 1, borderColor: theme.border 
  },
  countText: { color: theme.primary, fontWeight: '800', fontSize: 13 },
  
  searchBar: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, 
    borderRadius: 16, paddingHorizontal: 16, marginBottom: 16, height: 52, 
    borderWidth: 1, borderColor: theme.border 
  },
  searchIcon: { fontSize: 18, marginRight: 10, color: theme.textMuted },
  searchInput: { flex: 1, color: theme.text, fontSize: 14, fontWeight: '600' },
  
  filterBar: { marginBottom: 4 },
  chip: { 
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, 
    backgroundColor: theme.surface, marginRight: 10, borderWidth: 1, borderColor: theme.border 
  },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { color: theme.textSecondary, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#FFF' },

  list: { padding: 24, paddingBottom: 100 },
  card: { 
    backgroundColor: theme.surface, borderRadius: 24, padding: 20, 
    marginBottom: 16, borderWidth: 1, borderColor: theme.border,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  orderNumber: { fontSize: 17, fontWeight: '800', color: theme.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  customerName: { fontSize: 15, color: theme.textSecondary, fontWeight: '600', marginBottom: 16 },
  cardFooter: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16 
  },
  itemCount: { fontSize: 11, color: theme.textMuted, fontWeight: '800', letterSpacing: 0.5 },
  platform: { 
    fontSize: 9, color: theme.primary, fontWeight: '900', letterSpacing: 1,
    backgroundColor: `${theme.primary}10`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 
  },
  
  empty: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 64, color: theme.border, marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22 },
});

export default OrdersListScreen;

