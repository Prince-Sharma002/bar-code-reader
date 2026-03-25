import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../constants/ThemeContext';

const SignupScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { signup, loading } = useContext(AuthContext);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    password: ''
  });

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSignup = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Error', 'Email and Password are required');
      return;
    }
    const res = await signup(form);
    if (res.success) {
      Alert.alert('Success', 'Account created successfully!');
      // Assuming AuthContext instantly logs you in, AppNavigator will automatically unmount this screen
    } else {
      Alert.alert('Signup Failed', res.error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, width: '100%' }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} centerContent>
          <View style={styles.formContainer}>
            <Text style={[styles.title, { color: theme.primary }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.text, opacity: 0.7 }]}>Join us to manage your scans.</Text>

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="First Name"
                placeholderTextColor={theme.text + '80'}
                value={form.first_name}
                onChangeText={(val) => handleChange('first_name', val)}
              />
              <TextInput
                style={[styles.input, styles.halfInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="Last Name"
                placeholderTextColor={theme.text + '80'}
                value={form.last_name}
                onChangeText={(val) => handleChange('last_name', val)}
              />
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Phone Number"
              placeholderTextColor={theme.text + '80'}
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(val) => handleChange('phone', val)}
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Email*"
              placeholderTextColor={theme.text + '80'}
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(val) => handleChange('email', val)}
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Password*"
              placeholderTextColor={theme.text + '80'}
              secureTextEntry
              value={form.password}
              onChangeText={(val) => handleChange('password', val)}
            />

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.primary }]} 
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <Text style={[styles.buttonText, { color: theme.background }]}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={{ color: theme.text }}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    width: '85%',
    maxWidth: 400,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    marginTop: 24,
    justifyContent: 'center',
  }
});

export default SignupScreen;
