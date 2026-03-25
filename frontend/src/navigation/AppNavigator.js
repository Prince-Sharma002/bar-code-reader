import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, Platform, SafeAreaView } from 'react-native';
import ScannerScreen from '../screens/ScannerScreen';
import HistoryScreen from '../screens/HistoryScreen';
import OrdersListScreen from '../screens/OrdersListScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import ItemVerificationScreen from '../screens/ItemVerificationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../constants/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabIcon = ({ focused, emoji, label, theme }) => (
  <View style={styles.iconWrap}>
    <Text style={[styles.emoji, { color: theme.text }, focused && { opacity: 1, color: theme.primary }]}>{emoji}</Text>
    {focused && <Text style={[styles.label, { color: theme.primary }]}>{label}</Text>}
  </View>
);

const HeaderRight = () => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
      <ThemeToggle />
    </View>
  );
};

const TabNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTitle: "",
        headerRight: () => <HeaderRight />,
        tabBarStyle: [styles.tabBar, { 
          backgroundColor: theme.surface, 
          borderTopColor: theme.border 
        }],
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ 
          headerTransparent: true,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="⬡" label="Scan" theme={theme} /> 
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersListScreen}
        options={{ 
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="◫" label="Orders" theme={theme} /> 
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ 
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="◷" label="History" theme={theme} /> 
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ 
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="⍾" label="Profile" theme={theme} /> 
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { theme } = useTheme();
  const { token, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <Text style={{ color: theme.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '800',
        },
        headerRight: () => <HeaderRight />,
      }}
    >
      {token ? (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Details' }} />
          <Stack.Screen name="ItemVerification" component={ItemVerificationScreen} options={{ title: 'Verify Item' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 84 : 68,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    elevation: 10,
    borderTopWidth: 1,
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 2 },
  emoji: { fontSize: 20, opacity: 0.3 },
  label: { fontSize: 10, marginTop: 3, fontWeight: '600', letterSpacing: 0.3 },
});

export default AppNavigator;

