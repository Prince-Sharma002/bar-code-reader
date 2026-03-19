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
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getScanHistory, getExportUrl } from '../services/apiService';
import ScanHistoryItem from '../components/ScanHistoryItem';

const HistoryScreen = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch history from backend
  const fetchHistory = useCallback(async (searchQuery = '') => {
    try {
      if (!refreshing) setLoading(true);
      setError(null);
      const data = await getScanHistory({ search: searchQuery });
      setScans(data || []);
    } catch (err) {
      setError('Could not connect to the server. Showing local history if available.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

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
    setIsExporting(true);
    try {
      const url = getExportUrl();
      const fileUri = FileSystem.cacheDirectory + 'scan_history.csv';
      
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);
      
      if (downloadRes.status === 200) {
        await Sharing.shareAsync(downloadRes.uri);
      } else {
        Alert.alert('Export Failed', 'Could not download the CSV file.');
      }
    } catch (err) {
      console.error('Export Error:', err);
      Alert.alert('Error', 'An error occurred while exporting.');
    } finally {
      setIsExporting(false);
    }
  };

  const renderItem = ({ item, index }) => (
    <ScanHistoryItem scan={item} index={index} />
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
          <TouchableOpacity 
            style={[styles.exportBtn, isExporting && styles.exportBtnDisabled]} 
            onPress={handleExport}
            disabled={isExporting}
          >
            <Text style={styles.exportBtnText}>{isExporting ? '⏳' : '📥 CSV'}</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by barcode value..."
            placeholderTextColor="#555"
            value={search}
            onChangeText={handleSearch}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={submitSearch}>
            <Text style={styles.searchBtnText}>🔍</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#00E5FF20',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00E5FF30',
  },
  exportBtnDisabled: {
    opacity: 0.5,
  },
  exportBtnText: {
    color: '#00E5FF',
    fontWeight: '700',
    fontSize: 13,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#222',
  },
  searchBtn: {
    backgroundColor: '#1A1A1A',
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  searchBtnText: {
    fontSize: 18,
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
