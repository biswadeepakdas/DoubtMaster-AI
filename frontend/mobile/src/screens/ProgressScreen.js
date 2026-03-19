/**
 * Progress Screen - Learning dashboard with weakness analysis
 * Fetches real data from the API with proper loading / error / retry states.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { userAPI } from '../services/api.js';

const { width } = Dimensions.get('window');

export default function ProgressScreen() {
  const [progress, setProgress] = useState(null);
  const [weaknesses, setWeaknesses] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [progressRes, weaknessRes] = await Promise.all([
        userAPI.getProgress(),
        userAPI.getWeaknesses(),
      ]);
      setProgress(progressRes.data);
      setWeaknesses(weaknessRes.data);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load progress data.';
      setError(msg);
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setIsLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Error (no data at all)
  // ---------------------------------------------------------------------------
  if (error && !progress) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorTitle}>Could not load progress</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setIsLoading(true);
            loadData().finally(() => setIsLoading(false));
          }}
          accessibilityRole="button"
          accessibilityLabel="Retry loading progress"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Data loaded
  // ---------------------------------------------------------------------------
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#6366F1" />
        }
      >
        <Text style={styles.title}>Your Progress</Text>

        {/* Inline error banner (data loaded but refresh failed) */}
        {error && (
          <View style={styles.errorBanner} accessible accessibilityRole="alert">
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Overall Stats */}
        {progress?.overall && (
          <View style={styles.overallCard} accessible accessibilityLabel="Overall statistics">
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{progress.overall.rank}</Text>
            </View>
            <View style={styles.statsGrid}>
              <StatItem label="Total Solved" value={progress.overall.totalSolved} />
              <StatItem label="Accuracy" value={`${progress.overall.accuracy}%`} />
              <StatItem label="Streak" value={`${progress.overall.streak} days`} />
              <StatItem label="Best Streak" value={`${progress.overall.bestStreak} days`} />
            </View>
          </View>
        )}

        {/* Daily Goal */}
        {progress?.dailyGoal && (
          <View style={styles.goalCard} accessible accessibilityLabel={`Daily goal: ${progress.dailyGoal.completed} of ${progress.dailyGoal.target} questions`}>
            <Text style={styles.goalTitle}>Daily Goal</Text>
            <View style={styles.goalBar}>
              <View
                style={[
                  styles.goalFill,
                  {
                    width: `${Math.min(
                      (progress.dailyGoal.completed / progress.dailyGoal.target) * 100,
                      100
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.goalText}>
              {progress.dailyGoal.completed}/{progress.dailyGoal.target} questions
            </Text>
          </View>
        )}

        {/* Subject Breakdown */}
        {progress?.bySubject && (
          <>
            <Text style={styles.sectionTitle}>Subject Performance</Text>
            {Object.entries(progress.bySubject).map(([subject, data]) => (
              <View
                key={subject}
                style={styles.subjectCard}
                accessible
                accessibilityLabel={`${subject}: ${data.solved} solved, ${data.accuracy} percent accuracy, level ${data.level}`}
              >
                <View style={[styles.subjectIcon, { backgroundColor: getSubjectColor(subject) }]}>
                  <Text style={styles.subjectIconText}>{subject[0].toUpperCase()}</Text>
                </View>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>
                    {subject.charAt(0).toUpperCase() + subject.slice(1)}
                  </Text>
                  <Text style={styles.subjectMeta}>
                    {data.solved} solved | {data.accuracy}% accuracy
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${data.accuracy}%`,
                          backgroundColor: getSubjectColor(subject),
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>{data.level}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Weaknesses */}
        {weaknesses?.weakTopics?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Areas to Improve</Text>
            {weaknesses.weakTopics.map((topic, i) => (
              <View
                key={i}
                style={styles.weaknessCard}
                accessible
                accessibilityLabel={`${topic.subject} ${topic.topic}: ${Math.round(topic.errorRate * 100)} percent error rate`}
              >
                <View style={styles.weaknessHeader}>
                  <Text style={styles.weaknessSubject}>{topic.subject}</Text>
                  <Text style={styles.weaknessTopic}>{topic.topic}</Text>
                </View>
                <Text style={styles.weaknessDetail}>
                  Error rate: {Math.round(topic.errorRate * 100)}% ({topic.questionsAttempted}{' '}
                  questions)
                </Text>
                <View style={styles.weaknessBar}>
                  <View style={[styles.weaknessFill, { width: `${topic.errorRate * 100}%` }]} />
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function StatItem({ label, value }) {
  return (
    <View style={styles.statItem} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getSubjectColor(subject) {
  return (
    { math: '#6366F1', physics: '#3B82F6', chemistry: '#10B981', biology: '#F59E0B' }[subject] ||
    '#6366F1'
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: 50 },
  centered: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },

  errorTitle: { fontSize: 20, fontWeight: '700', color: '#DC2626', marginBottom: 8 },
  errorMessage: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  errorBanner: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8 },
  errorBannerText: { color: '#DC2626', textAlign: 'center', fontSize: 14 },

  title: { fontSize: 24, fontWeight: '700', color: '#1E293B', paddingHorizontal: 20, marginBottom: 16 },

  overallCard: { marginHorizontal: 16, padding: 20, backgroundColor: '#FFFFFF', borderRadius: 16, elevation: 2, marginBottom: 12 },
  rankBadge: { alignSelf: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  rankText: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statItem: { width: '50%', paddingVertical: 8 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 2 },

  goalCard: { marginHorizontal: 16, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16 },
  goalTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
  goalBar: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  goalFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 4 },
  goalText: { fontSize: 12, color: '#64748B', marginTop: 4 },

  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', paddingHorizontal: 16, marginTop: 16, marginBottom: 12 },

  subjectCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 12 },
  subjectIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  subjectIconText: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
  subjectInfo: { flex: 1, marginLeft: 12 },
  subjectName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  subjectMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  progressBar: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginTop: 6 },
  progressFill: { height: '100%', borderRadius: 2 },
  levelBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  levelText: { fontSize: 10, fontWeight: '600', color: '#64748B' },

  weaknessCard: { marginHorizontal: 16, marginBottom: 8, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  weaknessHeader: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  weaknessSubject: { fontSize: 12, fontWeight: '600', color: '#DC2626', textTransform: 'uppercase' },
  weaknessTopic: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  weaknessDetail: { fontSize: 12, color: '#64748B' },
  weaknessBar: { height: 4, backgroundColor: '#FEE2E2', borderRadius: 2, marginTop: 6 },
  weaknessFill: { height: '100%', backgroundColor: '#EF4444', borderRadius: 2 },
});
