/**
 * App Navigator - Main navigation structure
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore.js';

// Screens
import HomeScreen from '../screens/HomeScreen.js';
import CameraScreen from '../screens/CameraScreen.js';
import SolutionScreen from '../screens/SolutionScreen.js';
import ProgressScreen from '../screens/ProgressScreen.js';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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

function ProfilePlaceholder() {
  const { logout } = useAuthStore();
  const React = require('react');
  const { View, Text, TouchableOpacity, StyleSheet } = require('react-native');
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: '#1E293B' }}>Profile</Text>
      <TouchableOpacity
        style={{ marginTop: 20, backgroundColor: '#EF4444', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
        onPress={logout}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AppNavigator() {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="MainTabs" component={HomeTabs} />
            <Stack.Screen name="Solution" component={SolutionScreen} />
          </>
        ) : (
          <Stack.Screen name="MainTabs" component={HomeTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
