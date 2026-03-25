import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, View } from 'react-native';
import { useTheme } from '../constants/ThemeContext';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme, theme } = useTheme();

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
        }
      ]} 
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{isDarkMode ? '🌙' : '☀️'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  icon: {
    fontSize: 18,
  },
});

export default ThemeToggle;
