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
};

/**
 * Individual scan history list item with an entrance animation.
 */
const ScanHistoryItem = ({ scan, index }) => {
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
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const icon = FORMAT_ICONS[scan.format] || '🔲';
  const accentColor = FORMAT_COLORS[scan.format] || '#00E5FF';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      {/* Icon */}
      <View style={[styles.iconWrapper, { backgroundColor: `${accentColor}20` }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.barcodeValue} numberOfLines={1}>
          {scan.barcodeValue}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.formatBadge, { color: accentColor }]}>
            {scan.format}
          </Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.dateText}>{formatDate(scan.scannedAt)}</Text>
        </View>
        {scan.deviceId && scan.deviceId !== 'Unknown' && (
          <Text style={styles.deviceId}>📱 {scan.deviceId}</Text>
        )}
      </View>
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
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  iconText: {
    fontSize: 22,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  barcodeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
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
    color: '#555',
  },
  deviceId: {
    fontSize: 11,
    color: '#444',
  },
});

export default ScanHistoryItem;
