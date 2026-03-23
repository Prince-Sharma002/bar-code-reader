import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { getOrders } from '../services/apiService';
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/Colors';

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Ready', value: 'ready_to_ship' },
  { label: 'Packed', value: 'packed' },
  { label: 'Shipped', value: 'handed_to_courier' },
  { label: 'Delivered', value: 'delivered' },
];

const OrdersListScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  
  const navigation = useNavigation();

  const fetchOrders = async () => {
    try {
      const resp = await getOrders();
      if (resp.ok) {
        setOrders(resp.orders);
      }
    } catch (error) {
      console.error('Error fetching orders', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });
    
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = activeStatus === 'all' || order.status === activeStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, activeStatus]);

  const renderItem = ({ item }) => {
    const statusColor = item.status === 'packed' || item.status === 'ready_to_ship' ? Colors.order :
      item.status === 'pending' ? Colors.duplicate : 
      item.status === 'delivered' ? Colors.order : 
      item.status === 'returned' || item.status === 'processing' ? Colors.return : '#888';

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderNumber}>{item.order_number}</Text>
          <View style={[styles.statusBadge, { borderColor: statusColor, backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.customerName}>👤 {item.customer?.name || 'Customer'}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.itemCount}>📦 {item.items?.length || 0} Items</Text>
          <Text style={styles.platform}>{item.platform}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00E5FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.headerTitle}>📋 Orders</Text>
            <Text style={styles.headerSub}>Manage & Fulfill Orders</Text>
          </View>
          <View style={styles.orderCountBadge}>
            <Text style={styles.orderCountText}>{filteredOrders.length}</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Order ID or Customer..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Filter Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                activeStatus === filter.value && { backgroundColor: Colors.primary, borderColor: Colors.primary }
              ]}
              onPress={() => setActiveStatus(filter.value)}
            >
              <Text style={[
                styles.filterText,
                activeStatus === filter.value && { color: '#000' }
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <FlatList
        data={filteredOrders}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E5FF" />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🔎</Text>
            <Text style={styles.emptyTitle}>No Matching Orders</Text>
            <Text style={styles.emptyText}>Try adjusting your filters or search query.</Text>
            {(searchQuery || activeStatus !== 'all') && (
              <TouchableOpacity style={styles.resetBtn} onPress={() => { setSearchQuery(''); setActiveStatus('all'); }}>
                <Text style={styles.resetBtnText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 58, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#555', marginTop: 2 },
  orderCountBadge: { backgroundColor: '#1A1A1A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  orderCountText: { color: '#00E5FF', fontWeight: '800', fontSize: 13 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 12, marginBottom: 16, height: 46, borderWidth: 1, borderColor: '#222' },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },
  
  filterScroll: { marginBottom: 4 },
  filterContent: { paddingRight: 20 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A1A1A', marginRight: 8, borderWidth: 1, borderColor: '#222' },
  activeFilterChip: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
  filterText: { color: '#888', fontSize: 13, fontWeight: '600' },
  activeFilterText: { color: '#000', fontWeight: '700' },

  listContainer: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#141414', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderNumber: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '800' },
  customerName: { fontSize: 14, color: '#CCC', marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#222', paddingTop: 12 },
  itemCount: { fontSize: 13, color: '#888', fontWeight: '600' },
  platform: { fontSize: 12, color: '#666', fontWeight: '500', backgroundColor: '#1A1A1A', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 50, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#777', marginBottom: 20, textAlign: 'center' },
  resetBtn: { backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  resetBtnText: { color: '#00E5FF', fontWeight: '700', fontSize: 14 }
});

export default OrdersListScreen;
