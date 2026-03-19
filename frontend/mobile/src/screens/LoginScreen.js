/**
 * Login Screen - Email/phone + password authentication
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { authAPI } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await authAPI.login({ email: email.trim(), password });
      const user = data.user || { email: email.trim() };
      await login(user, data, data.refreshToken);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>DoubtMaster AI</Text>
        <Text style={styles.tagline}>Understand, Don't Just See the Answer</Text>

        {error && (
          <View style={styles.errorBanner} accessible accessibilityRole="alert">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.label}>Email or Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          accessibilityLabel="Email or phone input"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Your password"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          accessibilityLabel="Password input"
        />

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Log in"
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupLink}
          onPress={() => navigation.navigate('Signup')}
          accessibilityRole="button"
          accessibilityLabel="Go to sign up"
        >
          <Text style={styles.signupLinkText}>
            Don't have an account? <Text style={styles.signupLinkBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  logo: { fontSize: 32, fontWeight: '800', color: '#6366F1', textAlign: 'center' },
  tagline: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 32 },

  errorBanner: { backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#DC2626', textAlign: 'center', fontSize: 14 },

  label: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 16,
  },

  loginButton: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: { backgroundColor: '#A5B4FC' },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  signupLink: { marginTop: 20, alignItems: 'center' },
  signupLinkText: { fontSize: 14, color: '#64748B' },
  signupLinkBold: { color: '#6366F1', fontWeight: '700' },
});
