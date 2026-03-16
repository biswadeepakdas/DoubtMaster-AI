/**
 * Solution Screen - Step-by-step solution display with Learn Mode
 * Animated steps, concept tags, "why" explanations
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { questionAPI } from '../services/api.js';

export default function SolutionScreen({ route, navigation }) {
  const { solution, extractedText, subject, confidence, questionId } = route.params || {};
  const [revealedSteps, setRevealedSteps] = useState(3); // Show first 3 steps
  const [learnModeActive, setLearnModeActive] = useState(false);
  const [studentResponse, setStudentResponse] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showFinalAnswer, setShowFinalAnswer] = useState(false);

  const steps = solution?.steps || [];
  const totalSteps = steps.length;
  const isLearnModeRequired = solution?.learnModeRequired && !showFinalAnswer;

  useEffect(() => {
    // Auto-activate Learn Mode after showing initial steps
    if (isLearnModeRequired && revealedSteps >= 3) {
      setLearnModeActive(true);
    }
  }, [revealedSteps, isLearnModeRequired]);

  const handleLearnModeSubmit = async () => {
    if (studentResponse.length < 10) return;
    setIsEvaluating(true);

    try {
      const { data } = await questionAPI.submitLearnMode(questionId, studentResponse);
      setEvaluation(data);
      if (data.passed) {
        setShowFinalAnswer(true);
        setRevealedSteps(totalSteps);
      }
    } catch (err) {
      setEvaluation({ score: 0, passed: false, feedback: 'Error evaluating. Try again.' });
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionLabel}>Question</Text>
          <Text style={styles.questionText}>{extractedText || 'Question text'}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: getSubjectColor(subject) }]}>
              <Text style={styles.badgeText}>{subject || 'Math'}</Text>
            </View>
            <Text style={styles.confidenceText}>
              {Math.round((confidence || 0.97) * 100)}% confidence
            </Text>
          </View>
        </View>

        {/* Steps */}
        <Text style={styles.sectionTitle}>Solution Steps</Text>
        {steps.slice(0, revealedSteps).map((step, index) => (
          <StepCard key={index} step={step} index={index} />
        ))}

        {/* Learn Mode Gate */}
        {isLearnModeRequired && learnModeActive && !showFinalAnswer && (
          <View style={styles.learnModeCard}>
            <View style={styles.learnModeHeader}>
              <Text style={styles.learnModeIcon}>{'🧠'}</Text>
              <Text style={styles.learnModeTitle}>Learn Mode</Text>
            </View>
            <Text style={styles.learnModeDescription}>
              Before seeing the final answer, explain what you understood from the steps above.
              This helps you actually learn, not just copy!
            </Text>

            <TextInput
              style={styles.learnModeInput}
              multiline
              numberOfLines={4}
              placeholder="Type your understanding here... (min 10 characters)"
              placeholderTextColor="#94A3B8"
              value={studentResponse}
              onChangeText={setStudentResponse}
            />

            <TouchableOpacity
              style={[styles.submitButton, studentResponse.length < 10 && styles.submitButtonDisabled]}
              onPress={handleLearnModeSubmit}
              disabled={studentResponse.length < 10 || isEvaluating}
            >
              {isEvaluating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Check Understanding</Text>
              )}
            </TouchableOpacity>

            {/* Evaluation Result */}
            {evaluation && (
              <View style={[styles.evaluationCard, evaluation.passed ? styles.evaluationPassed : styles.evaluationFailed]}>
                <Text style={styles.evaluationScore}>Score: {evaluation.score}%</Text>
                <Text style={styles.evaluationFeedback}>{evaluation.feedback}</Text>
                {evaluation.hint && (
                  <Text style={styles.evaluationHint}>Hint: {evaluation.hint}</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Final Answer */}
        {(showFinalAnswer || !isLearnModeRequired) && solution?.finalAnswer && (
          <View style={styles.finalAnswerCard}>
            <Text style={styles.finalAnswerLabel}>Final Answer</Text>
            <Text style={styles.finalAnswerText}>{solution.finalAnswer}</Text>
          </View>
        )}

        {/* Concept Tags */}
        {solution?.conceptTags && (
          <View style={styles.conceptTagsContainer}>
            <Text style={styles.conceptTagsLabel}>Related Concepts</Text>
            <View style={styles.tagRow}>
              {solution.conceptTags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>{'💾'}</Text>
            <Text style={styles.actionLabel}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>{'📤'}</Text>
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Camera')}>
            <Text style={styles.actionIcon}>{'📸'}</Text>
            <Text style={styles.actionLabel}>New</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function StepCard({ step, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>{step.stepNumber || index + 1}</Text>
        </View>
        <Text style={styles.stepTitle}>{step.title}</Text>
      </View>

      <Text style={styles.stepContent}>{step.content}</Text>

      {step.formula && (
        <View style={styles.formulaBox}>
          <Text style={styles.formulaText}>{step.formula}</Text>
        </View>
      )}

      {/* Why explanation (expandable) */}
      <TouchableOpacity
        style={styles.whyButton}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.whyButtonText}>
          {expanded ? '▼ Hide explanation' : '▶ Why this step?'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationText}>{step.explanation}</Text>
          {step.concept && (
            <View style={styles.conceptBadge}>
              <Text style={styles.conceptBadgeText}>Concept: {step.concept}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function getSubjectColor(subject) {
  const colors = { math: '#6366F1', physics: '#3B82F6', chemistry: '#10B981', biology: '#F59E0B' };
  return colors[subject] || '#6366F1';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollView: { flex: 1 },

  questionCard: { margin: 16, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  questionLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
  questionText: { fontSize: 16, fontWeight: '500', color: '#1E293B', marginTop: 8, lineHeight: 24 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  confidenceText: { fontSize: 12, color: '#64748B' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },

  stepCard: { marginHorizontal: 16, marginBottom: 8, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#6366F1', elevation: 1 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepNumberText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  stepTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B', flex: 1 },
  stepContent: { fontSize: 14, color: '#334155', lineHeight: 22 },
  formulaBox: { backgroundColor: '#F0F0FF', padding: 10, borderRadius: 8, marginTop: 8 },
  formulaText: { fontSize: 14, fontFamily: 'monospace', color: '#4338CA' },

  whyButton: { marginTop: 8 },
  whyButtonText: { fontSize: 13, color: '#6366F1', fontWeight: '500' },
  explanationBox: { marginTop: 8, padding: 12, backgroundColor: '#FFFBEB', borderRadius: 8 },
  explanationText: { fontSize: 13, color: '#92400E', lineHeight: 20 },
  conceptBadge: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  conceptBadgeText: { fontSize: 11, color: '#92400E', fontWeight: '600' },

  learnModeCard: { margin: 16, padding: 20, backgroundColor: '#EEF2FF', borderRadius: 16, borderWidth: 2, borderColor: '#6366F1' },
  learnModeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  learnModeIcon: { fontSize: 24, marginRight: 8 },
  learnModeTitle: { fontSize: 18, fontWeight: '700', color: '#4338CA' },
  learnModeDescription: { fontSize: 14, color: '#4338CA', lineHeight: 20, marginBottom: 12 },
  learnModeInput: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, fontSize: 14, textAlignVertical: 'top', minHeight: 100, borderWidth: 1, borderColor: '#C7D2FE' },
  submitButton: { marginTop: 12, backgroundColor: '#6366F1', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#A5B4FC' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  evaluationCard: { marginTop: 12, padding: 16, borderRadius: 12 },
  evaluationPassed: { backgroundColor: '#D1FAE5' },
  evaluationFailed: { backgroundColor: '#FEE2E2' },
  evaluationScore: { fontSize: 18, fontWeight: '700' },
  evaluationFeedback: { fontSize: 14, marginTop: 4 },
  evaluationHint: { fontSize: 13, marginTop: 8, fontStyle: 'italic' },

  finalAnswerCard: { margin: 16, padding: 20, backgroundColor: '#D1FAE5', borderRadius: 16, borderWidth: 2, borderColor: '#10B981' },
  finalAnswerLabel: { fontSize: 12, fontWeight: '600', color: '#065F46', textTransform: 'uppercase', letterSpacing: 1 },
  finalAnswerText: { fontSize: 20, fontWeight: '700', color: '#065F46', marginTop: 8 },

  conceptTagsContainer: { marginHorizontal: 16, marginTop: 8 },
  conceptTagsLabel: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tagText: { fontSize: 12, color: '#475569' },

  actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 24, marginHorizontal: 16 },
  actionButton: { alignItems: 'center' },
  actionIcon: { fontSize: 28 },
  actionLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
});
