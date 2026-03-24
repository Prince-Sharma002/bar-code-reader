import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, Platform } from 'react-native';
import ScannerScreen from '../screens/ScannerScreen';
import HistoryScreen from '../screens/HistoryScreen';
import OrdersListScreen from '../screens/OrdersListScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import ItemVerificationScreen from '../screens/ItemVerificationScreen';

import Colors from '../constants/Colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabIcon = ({ focused, emoji, label }) => (
  <View style={styles.iconWrap}>
    <Text style={[styles.emoji, focused && styles.emojiActive]}>{emoji}</Text>
    {focused && <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>}
  </View>
);

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarShowLabel: false,
    }}
  >
    <Tab.Screen
      name="Scanner"
      component={ScannerScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="⬡" label="Scan" /> }}
    />
    <Tab.Screen
      name="Orders"
      component={OrdersListScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="◫" label="Orders" /> }}
    />
    <Tab.Screen
      name="History"
      component={HistoryScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="◷" label="History" /> }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={TabNavigator} />
    <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    <Stack.Screen name="ItemVerification" component={ItemVerificationScreen} />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 68,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    elevation: 0,
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 2 },
  emoji: { fontSize: 20, opacity: 0.3, color: Colors.text },
  emojiActive: { opacity: 1, color: Colors.primary },
  label: { fontSize: 10, color: Colors.textMuted, marginTop: 3, fontWeight: '600', letterSpacing: 0.3 },
  labelActive: { color: Colors.primary },
});

export default AppNavigator;
