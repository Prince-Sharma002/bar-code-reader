import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

// Map barcode format names to emoji icons
const FORMAT_ICONS = {
  QR_CODE: '⬜',
  EAN_13: '〓',
  EAN_8: '〓',
  UPC_A: '〓',
  UPC_E: '〓',
  CODE_128: '≡',
  CODE_39: '≡',
  CODE_93: '≡',
  PDF_417: '▦',
  AZTEC: '◈',
  DATA_MATRIX: '▪',
  ITF_14: '≣',
};

// Map formats to color accents
const FORMAT_COLORS = {
  QR_CODE: '#00E5FF',
  EAN_13: '#A78BFA',
  EAN_8: '#A78BFA',
  CODE_128: '#34D399',
  CODE_39: '#34D399',
  UPC_A: '#F472B6',
  UPC_E: '#F472B6',
  PDF_417: '#FBBF24',
  AZTEC: '#FB923C',
  DATA_MATRIX: '#60A5FA',
  ITF_14: '#94A3B8',
};

import Colors from '../constants/Colors';
import { TouchableOpacity } from 'react-native';

const TYPE_ICONS = {
  order: '🎯',
  return: '🔄',
  product: '🍱',
  unknown: '📄',
};

/**
 * Individual scan history list item with an entrance animation.
 */
const ScanHistoryItem = ({ scan, index, isSelected, onSelect, isSelectionMode }) => {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Stagger animation based on index
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const accentColor = Colors[scan.type] || Colors.primary;
  const typeIcon = TYPE_ICONS[scan.type] || '📄';
  const formatIcon = FORMAT_ICONS[scan.format] || '🔲';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
        isSelected && { backgroundColor: `${accentColor}15`, borderColor: accentColor },
      ]}
    >
      <TouchableOpacity 
         activeOpacity={0.7} 
         onPress={() => onSelect(scan)}
         style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
      >
        {isSelectionMode && (
          <View style={[styles.checkbox, isSelected && { backgroundColor: accentColor, borderColor: accentColor }]}>
            {isSelected && <Text style={styles.checkMark}>✓</Text>}
          </View>
        )}

        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        {/* Icon Wrapper (Show Type Icon instead of Format Icon for prominence) */}
        <View style={[styles.iconWrapper, { backgroundColor: `${accentColor}15` }]}>
          <Text style={styles.iconText}>{typeIcon}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
             <Text style={styles.barcodeValue} numberOfLines={1}>
               {scan.barcodeValue}
             </Text>
             {scan.type !== 'unknown' && (
                <View style={[styles.typeBadge, { backgroundColor: `${accentColor}20` }]}>
                   <Text style={[styles.typeBadgeText, { color: accentColor }]}>{scan.type}</Text>
                </View>
             )}
          </View>
          
          <View style={styles.meta}>
            <Text style={[styles.formatBadge, { color: accentColor }]}>
               {formatIcon} {scan.format}
            </Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.dateText}>{formatDate(scan.scannedAt || scan.timestamp)}</Text>
          </View>
          
          {scan.deviceId && scan.deviceId !== 'Unknown' && (
            <Text style={styles.deviceId}>📱 {scan.deviceId}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#141414',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
    padding: 14,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#333',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkMark: {
    color: '#0A0A0A',
    fontSize: 12,
    fontWeight: '900'
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  content: {
    flex: 1,
    gap: 2,
    marginLeft: 10
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  barcodeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formatBadge: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  separator: {
    color: '#333',
    fontSize: 10,
  },
  dateText: {
    fontSize: 11,
    color: '#777',
  },
  deviceId: {
    fontSize: 11,
    color: '#555',
    marginTop: 2
  },
});

export default ScanHistoryItem;
