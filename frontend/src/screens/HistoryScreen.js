import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useTheme } from '../constants/ThemeContext';

const HistoryScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const fetchHistory = useCallback(async (searchQuery = '') => {
    try {
      if (!refreshing) setLoading(true);
      setError(null);
      const params = { search: searchQuery };
      if (filterType !== 'all') params.type = filterType;
      const data = await getScanHistory(params);
      setScans(data || []);
    } catch (err) {
      setError('Connection interrupted. Showing local data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, filterType]);

  useEffect(() => {
    fetchHistory();
    const sub = navigation.addListener('focus', fetchHistory);
    return sub;
  }, [fetchHistory, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory(search);
  };

  const handleExport = async () => {
    if (scans.length === 0) return;
    setIsExporting(true);
    try {
      const url = getExportUrl(selectedIds);
      const fileUri = FileSystem.cacheDirectory + `logs_${Date.now()}.csv`;
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);
      if (downloadRes.status === 200) await Sharing.shareAsync(downloadRes.uri);
    } catch (err) {
      Alert.alert('Export Error', 'CSV generation failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleSelect = (scan) => {
    const id = scan._id || scan.id;
    if (!id) return;
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
    Alert.alert('Delete Logs', `Remove ${selectedIds.length} records?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteScans(selectedIds);
            setScans(prev => prev.filter(s => !selectedIds.includes(s._id || s.id)));
            setSelectedIds([]);
            setIsSelectionMode(false);
          } catch (err) {
            Alert.alert('Error', 'Deletion failed.');
          }
        }
      }
    ]);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerSub}>ACTIVITY ARCHIVE</Text>
            <Text style={styles.headerTitle}>Scan Feed</Text>
          </View>
          
          <View style={styles.actionRow}>
            {isSelectionMode && (
              <TouchableOpacity 
                style={styles.circleBtn} 
                onPress={() => setSelectedIds(selectedIds.length === scans.length ? [] : scans.map(s => s._id))}
              >
                <Text style={styles.btnIcon}>{selectedIds.length === scans.length ? '⬡' : '⬢'}</Text>
              </TouchableOpacity>
            )}

            {isSelectionMode && (
              <TouchableOpacity style={[styles.circleBtn, styles.dangerBtn]} onPress={handleDeleteSelected}>
                <Text style={[styles.btnIcon, { color: theme.error }]}>◿</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.glassBtn, isExporting && styles.btnDisabled]} 
              onPress={handleExport}
              disabled={isExporting}
            >
              <Text style={styles.glassBtnText}>
                {isExporting ? '...' : selectedIds.length > 0 ? `EXPORT (${selectedIds.length})` : 'EXPORT'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.circleBtn, showFilters && styles.circleBtnActive]} 
              onPress={() => setShowFilters(!showFilters)}
            >
              <Text style={styles.btnIcon}>⚲</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showFilters && (
          <View style={styles.filterBox}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {['all', 'order', 'return', 'product', 'unknown'].map(type => (
                  <TouchableOpacity 
                    key={type} 
                    style={[styles.chip, filterType === type && styles.chipActive]}
                    onPress={() => setFilterType(type)}
                  >
                    <Text style={[styles.chipText, filterType === type && styles.chipTextActive]}>
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
             </ScrollView>
             
             <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filter by barcode..."
                  placeholderTextColor={theme.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={() => fetchHistory(search)}
                />
                <TouchableOpacity style={styles.applyBtn} onPress={() => fetchHistory(search)}>
                   <Text style={styles.applyBtnText}>SCAN</Text>
                </TouchableOpacity>
             </View>
          </View>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => item._id || item.timestamp || Math.random().toString()}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>◰</Text>
              <Text style={styles.emptyTitle}>Archive Empty</Text>
              <Text style={styles.emptyText}>No scanning activity recorded in this view.</Text>
            </View>
          }
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        />
      )}
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 20, paddingBottom: 20, paddingHorizontal: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  headerSub: { fontSize: 10, fontWeight: '800', color: theme.textMuted, letterSpacing: 1.5 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: theme.text, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10 },
  
  glassBtn: { 
    backgroundColor: theme.surface, paddingHorizontal: 16, height: 44, 
    borderRadius: 14, borderWidth: 1, borderColor: theme.border, 
    justifyContent: 'center', alignItems: 'center' 
  },
  glassBtnText: { color: theme.primary, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  circleBtn: { 
    width: 44, height: 44, borderRadius: 14, backgroundColor: theme.surface, 
    borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' 
  },
  circleBtnActive: { borderColor: theme.primary, backgroundColor: `${theme.primary}10` },
  btnIcon: { fontSize: 18, color: theme.textSecondary },
  dangerBtn: { borderColor: `${theme.error}40` },
  btnDisabled: { opacity: 0.5 },

  filterBox: { marginTop: 8, gap: 16 },
  chipScroll: { marginHorizontal: -24, paddingHorizontal: 24 },
  chip: { 
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, 
    backgroundColor: theme.surface, marginRight: 10, borderWidth: 1, borderColor: theme.border 
  },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { color: theme.textSecondary, fontSize: 12, fontWeight: '800' },
  chipTextActive: { color: '#FFF' },

  searchRow: { flexDirection: 'row', gap: 12 },
  searchInput: { 
    flex: 1, backgroundColor: theme.isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)', borderRadius: 14, 
    paddingHorizontal: 16, height: 48, color: theme.text, fontSize: 14, 
    borderWidth: 1, borderColor: theme.border 
  },
  applyBtn: { 
    backgroundColor: theme.surfaceElevated, paddingHorizontal: 20, 
    borderRadius: 14, justifyContent: 'center', borderWidth: 1, borderColor: theme.primary 
  },
  applyBtnText: { color: theme.primary, fontWeight: '900', fontSize: 11 },

  list: { paddingHorizontal: 24, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 64, color: theme.border, marginBottom: 20, textAlign: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22 },
});

export default HistoryScreen;

