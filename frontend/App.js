import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/constants/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';

/**
 * Root of the application components.
 * This is a sub-component to access theme context for status bar etc.
 */
function AppContent() {
  const { isDarkMode } = useTheme();
  
  return (
    <NavigationContainer>
      <AppNavigator />
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

/**
 * Root of the application.
 * ThemeProvider wraps the entire application.
 */
export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(reg => console.log('Service Worker registered:', reg))
          .catch(err => console.log('Service Worker registration failed:', err));
      });
    }
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

