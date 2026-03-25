import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { light, dark } from './Colors'

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const deviceColorScheme = useColorScheme(); // 'light' or 'dark'
  const [isDarkMode, setIsDarkMode] = useState(deviceColorScheme === 'dark');

  // Load saved theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('user-theme-preference');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem('user-theme-preference', newMode ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const theme = isDarkMode ? dark : light;

  return (
    <ThemeContext.Provider value={{ isDarkMode, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
