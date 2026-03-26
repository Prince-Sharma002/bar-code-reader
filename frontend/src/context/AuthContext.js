import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authLogin } from '../services/apiService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing session
    const loadStorageData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('@access_token');
        const storedUser = await AsyncStorage.getItem('@user_data');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to load storage data', e);
      } finally {
        setLoading(false);
      }
    };
    loadStorageData();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authLogin(email, password);
      if (data.accessToken) {
        await AsyncStorage.setItem('@access_token', data.accessToken);
        await AsyncStorage.setItem('@refresh_token', data.refreshToken);
        await AsyncStorage.setItem('@user_data', JSON.stringify(data.user));
        setToken(data.accessToken);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: 'Token missing' };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.response?.data?.error || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };



  const logout = async () => {
    setLoading(true);
    await AsyncStorage.removeItem('@access_token');
    await AsyncStorage.removeItem('@refresh_token');
    await AsyncStorage.removeItem('@user_data');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
