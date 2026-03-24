import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getScanHistory, getExportUrl, deleteScans } from '../services/apiService';
import ScanHistoryItem from '../components/ScanHistoryItem';
import Colors from '../constants/Colors';

const HistoryScreen = ({ navigation }) => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState('all'); // all, order, return, product, unknown
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Fetch history from backend
  const fetchHistory = useCallback(async (searchQuery = '') => {
    try {
      if (!refreshing) setLoading(true);
      setError(null);
      const params = { search: searchQuery };
      if (filterType !== 'all') params.type = filterType;
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      const data = await getScanHistory(params);
      setScans(data || []);
    } catch (err) {
      setError('Could not connect to the server. Showing local history if available.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, filterType, startDate, endDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory(search);
  };

  const handleSearch = (text) => {
    setSearch(text);
    // Debounce or search on submit
  };

  const submitSearch = () => {
    fetchHistory(search);
  };

  const handleExport = async () => {
    if (scans.length === 0) {
      Alert.alert('No Data', 'There are no scans to export.');
      return;
    }

    setIsExporting(true);
    try {
      // If items selected, only export those
      const url = getExportUrl(selectedIds);
      const fileUri = FileSystem.cacheDirectory + `scan_history_${Date.now()}.csv`;
      
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);
      
      if (downloadRes.status === 200) {
        await Sharing.shareAsync(downloadRes.uri);
      } else {
        throw new Error('Download failed');
      }
    } catch (err) {
      console.log('Export Error, falling back to local CSV generation:', err);
      try {
        const scansToExport = selectedIds.length > 0 
          ? scans.filter(s => selectedIds.includes(s._id))
          : scans;

        // Generate CSV string locally
        const header = "Date,Barcode,Format,Type,Device\n";
        const rows = scansToExport.map(s => 
          `${new Date(s.scannedAt || s.timestamp).toLocaleString()},${s.barcodeValue},${s.format},${s.type || 'unknown'},${s.deviceId || 'Unknown'}`
        ).join("\n");
        const csvContent = header + rows;

        const localUri = FileSystem.cacheDirectory + 'manual_export.csv';
        await FileSystem.writeAsStringAsync(localUri, csvContent);
        await Sharing.shareAsync(localUri);
      } catch (innerErr) {
        Alert.alert('Export Failed', 'Could not generate CSV file locally.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleSelect = (scan) => {
    const id = scan._id || scan.id;
    if (!id) {
       console.log('Cannot select item without ID:', scan);
       return;
    }

    if (selectedIds.includes(id)) {
      const updated = selectedIds.filter(sid => sid !== id);
      setSelectedIds(updated);
      if (updated.length === 0) setIsSelectionMode(false);
    } else {
      setSelectedIds([...selectedIds, id]);
      setIsSelectionMode(true);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;

    Alert.alert(
      'Delete Scans',
      `Are you sure you want to delete ${selectedIds.length} selected scans?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            console.log('Deleting IDs:', selectedIds);
            try {
              const res = await deleteScans(selectedIds);
              console.log('Delete response from backend:', res);
              
              // Filter scans by _id or id
              setScans(prev => prev.filter(s => {
                 const scanId = s._id || s.id;
                 return !selectedIds.includes(scanId);
              }));
              
              setSelectedIds([]);
              setIsSelectionMode(false);
              Alert.alert('Success', `Deleted ${selectedIds.length} scans.`);
            } catch (err) {
              console.error('Delete failed:', err);
              Alert.alert('Error', `Failed to delete: ${err.response?.data?.message || err.message}`);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item, index }) => (
    <ScanHistoryItem 
      scan={item} 
      index={index} 
      isSelected={selectedIds.includes(item._id)}
      isSelectionMode={isSelectionMode}
      onSelect={handleToggleSelect}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>No Scans Found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your search or scan a barcode to see results here.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Scan History</Text>
            <Text style={styles.headerSubtitle}>
              {scans.length > 0 ? `${scans.length} records found` : 'Pull to refresh'}
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {isSelectionMode && (
              <TouchableOpacity 
                style={styles.selectAllBtn} 
                onPress={() => {
                  if (selectedIds.length === scans.length) {
                    setSelectedIds([]);
                    setIsSelectionMode(false);
                  } else {
                    setSelectedIds(scans.map(s => s._id).filter(id => !!id));
                  }
                }}
              >
                <Text style={styles.filterBtnText}>{selectedIds.length === scans.length ? '🔘' : '⭕'}</Text>
              </TouchableOpacity>
            )}

            {isSelectionMode && (
              <TouchableOpacity 
                style={styles.deleteBtn} 
                onPress={handleDeleteSelected}
              >
                <Text style={styles.deleteBtnText}>🗑️</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.exportBtn, isExporting && styles.exportBtnDisabled]} 
              onPress={handleExport}
              disabled={isExporting}
            >
              <Text style={styles.exportBtnText}>
                {isExporting ? '⏳' : selectedIds.length > 0 ? `📥 (${selectedIds.length})` : '📥 CSV'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterBtn, showFilters && styles.filterBtnActive]} 
              onPress={() => setShowFilters(!showFilters)}
            >
              <Text style={styles.filterBtnText}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showFilters && (
          <View style={styles.filtersBox}>
             <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Type:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                   {['all', 'order', 'return', 'product', 'unknown'].map(type => (
                     <TouchableOpacity 
                       key={type} 
                       style={[styles.filterTab, filterType === type && { backgroundColor: Colors[type] || Colors.primary }]}
                       onPress={() => setFilterType(type)}
                     >
                       <Text style={[styles.filterTabText, filterType === type && { color: '#000' }]}>
                         {type === 'all' ? 'All' : type.toUpperCase()}
                       </Text>
                     </TouchableOpacity>
                   ))}
                </ScrollView>
             </View>
             
             {/* Search Bar inside filters or below */}
             <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by barcode..."
                  placeholderTextColor="#444"
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={() => fetchHistory(search)}
                />
                <TouchableOpacity style={styles.applyBtn} onPress={() => fetchHistory(search)}>
                   <Text style={{ color: '#000', fontWeight: '800' }}>APPLY</Text>
                </TouchableOpacity>
             </View>
          </View>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00E5FF" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : error && scans.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchHistory(search)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => item._id || item.timestamp || Math.random().toString()}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={scans.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00E5FF"
              colors={['#00E5FF']}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exportBtn: {
    backgroundColor: '#111',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  exportBtnDisabled: {
    opacity: 0.5,
  },
  exportBtnText: {
    color: '#00E5FF',
    fontWeight: '800',
    fontSize: 12,
  },
  filterBtn: {
    backgroundColor: '#111',
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterBtnActive: {
    borderColor: '#00E5FF',
    backgroundColor: '#00E5FF20'
  },
  filterBtnText: { fontSize: 18 },
  deleteBtn: {
    backgroundColor: '#F4433620',
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F4433650',
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteBtnText: { fontSize: 18 },
  selectAllBtn: {
    backgroundColor: '#111',
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  filtersBox: {
    marginTop: 15,
    backgroundColor: '#0F0F0F',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222'
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  filterLabel: {
    color: '#555',
    fontWeight: '800',
    fontSize: 10,
    textTransform: 'uppercase',
    width: 40
  },
  filterTab: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333'
  },
  filterTabText: {
    color: '#777',
    fontSize: 11,
    fontWeight: '800'
  },

  searchContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#333',
  },
  applyBtn: {
    backgroundColor: '#00E5FF',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    color: '#555',
    fontSize: 14,
    marginTop: 12,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  retryText: {
    color: '#00E5FF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 21,
  },
});

export default HistoryScreen;
