/**
 * LoadingSpinner - Full-screen centered loading indicator
 *
 * Props:
 *   message (string, optional) — text below the spinner
 *   color   (string, optional) — spinner tint color (default #6366F1)
 */
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function LoadingSpinner({ message, color = '#6366F1' }) {
  return (
    <View style={styles.container} accessible accessibilityLabel={message || 'Loading'}>
      <ActivityIndicator size="large" color={color} />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  text: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
});
