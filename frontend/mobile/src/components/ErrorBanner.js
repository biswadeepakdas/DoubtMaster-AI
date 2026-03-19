/**
 * ErrorBanner - Reusable inline error message component
 *
 * Props:
 *   message  (string, required)  — error text to display
 *   onRetry  (function, optional) — if provided, shows a Retry button
 *   style    (object, optional)   — extra container styles
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ErrorBanner({ message, onRetry, style }) {
  if (!message) return null;

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <Text style={styles.text}>{message}</Text>
      {typeof onRetry === 'function' && (
        <TouchableOpacity
          onPress={onRetry}
          style={styles.retryButton}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: { color: '#DC2626', fontSize: 14, flex: 1 },
  retryButton: {
    marginLeft: 12,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
