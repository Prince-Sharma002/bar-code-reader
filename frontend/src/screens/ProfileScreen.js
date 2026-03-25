import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../constants/ThemeContext';
import { getProfile, updateProfile } from '../services/apiService';
import ThemeToggle from '../components/ThemeToggle';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { user, setUser, logout } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanStats, setScanStats] = useState({ total: 0, today: 0 });
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    role: user?.role || 'User',
    status: user?.status || 'Active'
  });

  useEffect(() => {
    fetchProfile();
    loadScanStats();
  }, [user]);

  const loadScanStats = async () => {
    try {
      const existing = await AsyncStorage.getItem('@scans_history');
      if (existing) {
        const history = JSON.parse(existing);
        const historyArray = Array.isArray(history) ? history : (history.data || []);
        
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const scansToday = historyArray.filter(s => new Date(s.timestamp) >= today).length;
        setScanStats({ total: historyArray.length, today: scansToday });
      }
    } catch(e) {}
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await getProfile();
      // use backend real data + existing context roles if possible
      setForm({
        first_name: res.user.first_name || '',
        last_name: res.user.last_name || '',
        phone: res.user.phone || '',
        email: res.user.email || '',
        status: res.user.status || '',
        role: user?.role || res.user.role || 'User' 
      });
    } catch (err) {
      console.log('Using local user context as fallback. API fetching failed (perhaps backend not restarted).');
      if (user) {
        setForm({
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          phone: user.phone || '',
          email: user.email || '',
          status: user.status || 'Active',
          role: user.role || 'User' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);
      const res = await updateProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone
      });
      if (res.user) {
        Alert.alert('Success', 'Profile updated successfully!');
        // Update context & storage so the rest of the app knows
        setUser(res.user);
        await AsyncStorage.setItem('@user_data', JSON.stringify(res.user));
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Update Failed', err.response?.data?.error || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  // Determine Initial for Avatar
  const initial = form.first_name 
    ? form.first_name.charAt(0).toUpperCase() 
    : form.email 
      ? form.email.charAt(0).toUpperCase() 
      : '?';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Card & Avatar */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'center', paddingVertical: 32 }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={[styles.profileName, { color: theme.text }]}>
            {form.first_name || form.last_name ? `${form.first_name} ${form.last_name}` : 'Setup your name'}
          </Text>
          <Text style={[styles.profileEmail, { color: theme.text }]}>
            {form.email}
          </Text>
          <View style={[styles.badge, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.badgeText, { color: theme.primary }]}>{form.role.toUpperCase()}</Text>
          </View>
        </View>

        {/* User Scan Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statLabel, { color: theme.text }]}>Total Scans</Text>
            <Text style={[styles.statValue, { color: theme.primary }]}>{scanStats.total}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statLabel, { color: theme.text }]}>Scans Today</Text>
            <Text style={[styles.statValue, { color: theme.primary }]}>{scanStats.today}</Text>
          </View>
        </View>

        {/* Edit Info Form */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Update Personal Information</Text>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: theme.text }]}>First Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={form.first_name}
                onChangeText={v => handleChange('first_name', v)}
                placeholderTextColor={theme.text + '80'}
              />
            </View>
            <View style={styles.halfInput}>
               <Text style={[styles.label, { color: theme.text }]}>Last Name</Text>
               <TextInput
                 style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                 value={form.last_name}
                 onChangeText={v => handleChange('last_name', v)}
                 placeholderTextColor={theme.text + '80'}
               />
            </View>
          </View>

          <Text style={[styles.label, { color: theme.text }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            value={form.phone}
            onChangeText={v => handleChange('phone', v)}
            placeholderTextColor={theme.text + '80'}
            keyboardType="phone-pad"
          />

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.primary }]} 
            onPress={handleUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.background }]}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Global Settings */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Settings & App Preferences</Text>
          
          <View style={styles.settingsRow}>
            <Text style={[styles.label, { color: theme.text, fontSize: 16, marginBottom: 0 }]}>
              Dark Mode (System Default: {isDarkMode ? 'On' : 'Off'})
            </Text>
            <ThemeToggle />
          </View>

          {/* Logout Section pushed to settings to clear the Header in Tab Navigator */}
          <TouchableOpacity 
            style={[styles.buttonOutline, { borderColor: theme.primary }]} 
            onPress={logout}
          >
            <Text style={[styles.buttonTextOutline, { color: theme.primary }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 15,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
    opacity: 0.8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 15,
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc3',
    marginBottom: 20
  },
  buttonOutline: {
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTextOutline: {
    fontSize: 16,
    fontWeight: '700',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 15,
    opacity: 0.6,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statLabel: {
    fontSize: 13,
    opacity: 0.7,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
  }
});

export default ProfileScreen;
