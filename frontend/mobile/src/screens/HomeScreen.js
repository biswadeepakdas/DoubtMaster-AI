/**
 * Home Screen - Main landing with one-tap camera solve
 * Agent 7: Frontend Engineer | Agent 8: UI/UX Designer
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useAppStore, useAuthStore } from '../store/authStore.js';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { user } = useAuthStore();
  const { currentStreak, todaySolved, isDarkMode, recentQuestions } = useAppStore();

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>
              Namaste, {user?.name || 'Student'}!
            </Text>
            <Text style={[styles.title, { color: theme.text }]}>
              Kya solve karein?
            </Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>{'🔥'}</Text>
            <Text style={[styles.streakCount, { color: theme.text }]}>{currentStreak}</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatCard
            label="Today"
            value={todaySolved}
            target={10}
            color="#6366F1"
            theme={theme}
          />
          <StatCard
            label="Streak"
            value={`${currentStreak} days`}
            color="#F59E0B"
            theme={theme}
          />
          <StatCard
            label="Plan"
            value={user?.plan === 'free' ? 'Free' : 'Pro'}
            color="#10B981"
            theme={theme}
          />
        </View>

        {/* Camera Solve Button (Primary CTA) */}
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={() => navigation.navigate('Camera')}
          activeOpacity={0.8}
        >
          <View style={styles.cameraButtonInner}>
            <Text style={styles.cameraIcon}>{'📸'}</Text>
            <Text style={styles.cameraText}>Photo Solve</Text>
            <Text style={styles.cameraSubtext}>Take a photo of any question</Text>
          </View>
        </TouchableOpacity>

        {/* Text Input Option */}
        <TouchableOpacity
          style={[styles.textInputButton, { backgroundColor: theme.surface }]}
          onPress={() => navigation.navigate('TextSolve')}
        >
          <Text style={styles.textInputIcon}>{'✏️'}</Text>
          <Text style={[styles.textInputLabel, { color: theme.text }]}>Type your question</Text>
        </TouchableOpacity>

        {/* Quick Access */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Access</Text>
        <View style={styles.quickAccessRow}>
          <QuickAccessCard
            icon="📚"
            label="NCERT"
            onPress={() => navigation.navigate('NCERTBrowser')}
            theme={theme}
          />
          <QuickAccessCard
            icon="🎯"
            label="JEE/NEET"
            onPress={() => navigation.navigate('ExamPrep')}
            theme={theme}
          />
          <QuickAccessCard
            icon="📝"
            label="Mock Test"
            onPress={() => navigation.navigate('MockTest')}
            theme={theme}
          />
          <QuickAccessCard
            icon="📊"
            label="Progress"
            onPress={() => navigation.navigate('Progress')}
            theme={theme}
          />
        </View>

        {/* Recent Questions */}
        {recentQuestions.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Doubts</Text>
            {recentQuestions.slice(0, 5).map((q, i) => (
              <TouchableOpacity
                key={q.id || i}
                style={[styles.recentItem, { backgroundColor: theme.surface }]}
                onPress={() => navigation.navigate('Solution', { questionId: q.id })}
              >
                <View style={[styles.subjectBadge, { backgroundColor: getSubjectColor(q.subject) }]}>
                  <Text style={styles.subjectBadgeText}>{q.subject?.[0]?.toUpperCase() || 'Q'}</Text>
                </View>
                <View style={styles.recentItemContent}>
                  <Text style={[styles.recentItemText, { color: theme.text }]} numberOfLines={1}>
                    {q.extractedText || 'Question'}
                  </Text>
                  <Text style={[styles.recentItemMeta, { color: theme.textSecondary }]}>
                    {q.subject} | {q.topic}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Upgrade Banner (Free users) */}
        {user?.plan === 'free' && (
          <TouchableOpacity
            style={styles.upgradeBanner}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.upgradeBannerTitle}>Unlock Unlimited Solves</Text>
            <Text style={styles.upgradeBannerSubtext}>
              Pro plan at just Rs.49/month - JEE/NEET prep, offline mode, no ads
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, target, color, theme }) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
        {label}{target ? `/${target}` : ''}
      </Text>
    </View>
  );
}

function QuickAccessCard({ icon, label, onPress, theme }) {
  return (
    <TouchableOpacity
      style={[styles.quickAccessCard, { backgroundColor: theme.surface }]}
      onPress={onPress}
    >
      <Text style={styles.quickAccessIcon}>{icon}</Text>
      <Text style={[styles.quickAccessLabel, { color: theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function getSubjectColor(subject) {
  const colors = { math: '#6366F1', physics: '#3B82F6', chemistry: '#10B981', biology: '#F59E0B' };
  return colors[subject] || '#6366F1';
}

const lightTheme = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
};

const darkTheme = {
  background: '#0F172A',
  surface: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  greeting: { fontSize: 14 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  streakEmoji: { fontSize: 18, marginRight: 4 },
  streakCount: { fontSize: 16, fontWeight: '700' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  statDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },

  cameraButton: { marginHorizontal: 20, marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  cameraButtonInner: { backgroundColor: '#6366F1', padding: 24, alignItems: 'center' },
  cameraIcon: { fontSize: 40, marginBottom: 8 },
  cameraText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  cameraSubtext: { fontSize: 14, color: '#C7D2FE', marginTop: 4 },

  textInputButton: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 24, padding: 16, borderRadius: 12, elevation: 1 },
  textInputIcon: { fontSize: 20, marginRight: 12 },
  textInputLabel: { fontSize: 16 },

  sectionTitle: { fontSize: 18, fontWeight: '600', paddingHorizontal: 20, marginBottom: 12 },

  quickAccessRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  quickAccessCard: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 12, elevation: 1 },
  quickAccessIcon: { fontSize: 28, marginBottom: 8 },
  quickAccessLabel: { fontSize: 12, fontWeight: '600' },

  recentItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 8, padding: 12, borderRadius: 12 },
  subjectBadge: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  subjectBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  recentItemContent: { flex: 1, marginLeft: 12 },
  recentItemText: { fontSize: 14, fontWeight: '500' },
  recentItemMeta: { fontSize: 12, marginTop: 2 },

  upgradeBanner: { marginHorizontal: 20, marginTop: 12, marginBottom: 32, padding: 20, borderRadius: 16, backgroundColor: '#6366F1' },
  upgradeBannerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  upgradeBannerSubtext: { fontSize: 14, color: '#C7D2FE', marginTop: 4 },
});
