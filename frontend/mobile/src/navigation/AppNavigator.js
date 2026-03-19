/**
 * App Navigator - Main navigation structure
 * Auth guard: unauthenticated users only see Login / Signup.
 */
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore.js';

// Screens
import HomeScreen from '../screens/HomeScreen.js';
import CameraScreen from '../screens/CameraScreen.js';
import SolutionScreen from '../screens/SolutionScreen.js';
import ProgressScreen from '../screens/ProgressScreen.js';
import LoginScreen from '../screens/LoginScreen.js';
import SignupScreen from '../screens/SignupScreen.js';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator();

// ---------------------------------------------------------------------------
// Deep linking configuration
// ---------------------------------------------------------------------------
const linking = {
  prefixes: ['doubtmaster://', 'https://doubtmaster.ai'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'home',
          Camera: 'camera',
          Progress: 'progress',
          Profile: 'profile',
        },
      },
      Solution: 'solution/:questionId',
      Login: 'login',
      Signup: 'signup',
    },
  },
};

// ---------------------------------------------------------------------------
// Tab navigator (authenticated)
// ---------------------------------------------------------------------------
function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home', tabBarIcon: () => null }}
      />
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{ tabBarLabel: 'Solve', tabBarIcon: () => null }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{ tabBarLabel: 'Progress', tabBarIcon: () => null }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfilePlaceholder}
        options={{ tabBarLabel: 'Profile', tabBarIcon: () => null }}
      />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Profile placeholder
// ---------------------------------------------------------------------------
function ProfilePlaceholder() {
  const { logout, user } = useAuthStore();

  return (
    <View style={profileStyles.container} accessible accessibilityLabel="Profile screen">
      <Text style={profileStyles.name}>{user?.name || 'Student'}</Text>
      <Text style={profileStyles.email}>{user?.email || ''}</Text>
      <TouchableOpacity
        style={profileStyles.logoutButton}
        onPress={logout}
        accessibilityRole="button"
        accessibilityLabel="Log out"
      >
        <Text style={profileStyles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  name: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
  email: { fontSize: 14, color: '#64748B', marginTop: 4 },
  logoutButton: { marginTop: 24, backgroundColor: '#EF4444', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  logoutText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});

// ---------------------------------------------------------------------------
// Auth flow screens (unauthenticated)
// ---------------------------------------------------------------------------
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animationEnabled: true }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Root navigator
// ---------------------------------------------------------------------------
export default function AppNavigator() {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="MainTabs" component={HomeTabs} />
            <Stack.Screen
              name="Solution"
              component={SolutionScreen}
              options={{ animationEnabled: true }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
