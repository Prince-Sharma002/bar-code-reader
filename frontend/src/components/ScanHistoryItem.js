import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useTheme } from '../constants/ThemeContext';

const TYPE_ICONS = {
  order: '◎',
  return: '↩',
  product: '◱',
  unknown: '📄',
};

const ScanHistoryItem = ({ scan, index, isSelected, onSelect, isSelectionMode }) => {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 50, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'RECENT';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const accentColor = theme[scan.type] || theme.primary;
  const typeIcon = TYPE_ICONS[scan.type] || '📄';

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
        isSelected && { backgroundColor: `${accentColor}10`, borderColor: `${accentColor}40` },
      ]}
    >
      <TouchableOpacity 
         activeOpacity={0.8} 
         onPress={() => onSelect(scan)}
         style={styles.touchable}
      >
        {isSelectionMode && (
          <View style={[styles.checkbox, isSelected && { backgroundColor: accentColor, borderColor: accentColor }]}>
            {isSelected && <Text style={styles.checkInner}>⬡</Text>}
          </View>
        )}

        <View style={[styles.iconBox, { backgroundColor: `${accentColor}15` }]}>
          <Text style={[styles.iconText, { color: accentColor }]}>{typeIcon}</Text>
        </View>

        <View style={styles.details}>
          <View style={styles.topRow}>
             <Text style={styles.barcode} numberOfLines={1}>{scan.barcodeValue}</Text>
             <Text style={styles.typeLabel}>{(scan.type || 'unknown').toUpperCase()}</Text>
          </View>
          
          <View style={styles.bottomRow}>
            <Text style={[styles.format, { color: accentColor }]}>{scan.format}</Text>
            <View style={styles.dot} />
            <Text style={styles.date}>{formatDate(scan.scannedAt || scan.timestamp)}</Text>
          </View>
        </View>

        {!isSelectionMode && (
          <Text style={styles.chevron}>▸</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    marginBottom: 12,
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkInner: { color: theme.background, fontSize: 14, fontWeight: '900' },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 22, fontWeight: '600' },
  details: { flex: 1, marginLeft: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  barcode: { fontSize: 15, fontWeight: '800', color: theme.text, flex: 1, marginRight: 8 },
  typeLabel: { fontSize: 8, fontWeight: '900', color: theme.textMuted, letterSpacing: 1 },
  bottomRow: { flexDirection: 'row', alignItems: 'center' },
  format: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: theme.border, marginHorizontal: 8 },
  date: { fontSize: 11, color: theme.textSecondary, fontWeight: '600' },
  chevron: { color: theme.border, fontSize: 18, marginLeft: 8 },
});

export default ScanHistoryItem;

