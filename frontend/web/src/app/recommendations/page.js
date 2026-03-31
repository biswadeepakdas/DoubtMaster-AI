'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sun, Moon, ArrowLeft, Brain, Target, AlertTriangle,
  TrendingUp, TrendingDown, CheckCircle, XCircle, RefreshCw,
  Lightbulb, BookOpen, Calendar, ChevronRight, Play,
  Calculator, Atom, FlaskConical, Dna, Sparkles, Send
} from 'lucide-react';
import api from '../../lib/api';

const subjectIcons = {
  Mathematics: Calculator, Physics: Atom, Chemistry: FlaskConical, Biology: Dna,
};
const strengthColors = {
  strong: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  moderate: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
  weak: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
};
const priorityColors = {
  high: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10',
  medium: 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10',
  low: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10',
};

export default function RecommendationsPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('weaknesses');
  const [weaknesses, setWeaknesses] = useState(null);
  const [practice, setPractice] = useState(null);
  const [studyPlan, setStudyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError] = useState(null);

  // Practice state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [practiceSubject, setPracticeSubject] = useState('');
  const [practiceTopic, setPracticeTopic] = useState('');

  const fetchWeaknesses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/v1/recommendations/weaknesses');
      setWeaknesses(res);
    } catch (err) {
      if (err?.status !== 401) setError(err?.message || 'Failed to load weakness data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('dm-token');
      if (!token) { router.replace('/login'); return; }
      const savedDark = localStorage.getItem('dm-dark');
      if (savedDark === 'true') setDarkMode(true);
      fetchWeaknesses();
    }
  }, [router, fetchWeaknesses]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    if (typeof window !== 'undefined') localStorage.setItem('dm-dark', String(darkMode));
  }, [darkMode]);

  const handleStartPractice = async (subject, topic) => {
    setPracticeLoading(true);
    setPracticeSubject(subject || '');
    setPracticeTopic(topic || '');
    setCurrentQuestion(0);
    setUserAnswer('');
    setEvaluation(null);
    try {
      let path = '/api/v1/recommendations/practice?count=3';
      if (subject) path += `&subject=${encodeURIComponent(subject)}`;
      if (topic) path += `&topic=${encodeURIComponent(topic)}`;
      const res = await api.get(path);
      setPractice(res);
      setActiveTab('practice');
    } catch (err) {
      alert(err?.message || 'Failed to generate practice questions');
    } finally {
      setPracticeLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!userAnswer.trim() || !practice?.questions?.[currentQuestion]) return;
    setEvaluating(true);
    try {
      const q = practice.questions[currentQuestion];
      const res = await api.post('/api/v1/recommendations/practice/evaluate', {
        question: q.question,
        student_answer: userAnswer,
        correct_answer: q.answer,
        subject: practiceSubject || practice.subject || 'General',
        topic: practiceTopic || practice.topic || q.topic || '',
      });
      setEvaluation(res);
    } catch (err) {
      alert(err?.message || 'Failed to evaluate answer');
    } finally {
      setEvaluating(false);
    }
  };

  const handleNextQuestion = () => {
    if (practice?.questions && currentQuestion < practice.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setUserAnswer('');
      setEvaluation(null);
    }
  };

  const handleGenerateStudyPlan = async () => {
    setPlanLoading(true);
    try {
      const res = await api.get('/api/v1/recommendations/study-plan');
      setStudyPlan(res);
      setActiveTab('plan');
    } catch (err) {
      alert(err?.message || 'Failed to generate study plan');
    } finally {
      setPlanLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'dark bg-gray-950' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-gray-500">Analyzing your learning patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'dark bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-950/80 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft className="w-5 h-5" /> <span className="font-medium">Dashboard</span>
          </button>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" /> Smart Practice
          </h1>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Tab nav */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {[
            { key: 'weaknesses', label: 'Weaknesses', icon: Target },
            { key: 'practice', label: 'Practice', icon: Play },
            { key: 'plan', label: 'Study Plan', icon: Calendar },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-600 dark:text-purple-400'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Weaknesses tab */}
        {activeTab === 'weaknesses' && weaknesses && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold mb-4">Analysis Summary</h2>
              <p className="text-sm text-gray-500 mb-4">
                Based on {weaknesses.totalQuestionsAnalyzed} questions analyzed
              </p>
              {weaknesses.summary?.topPriorityTopics?.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Priority topics needing attention:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {weaknesses.summary.topPriorityTopics.map((t, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {weaknesses.summary?.strongSubjects?.map((s, i) => (
                  <span key={i} className="text-xs px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {s}
                  </span>
                ))}
                {weaknesses.summary?.weakSubjects?.map((s, i) => (
                  <span key={i} className="text-xs px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Subject breakdown */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold mb-4">Subject Breakdown</h2>
              <div className="space-y-3">
                {weaknesses.subjects?.map(subj => {
                  const Icon = subjectIcons[subj.subject] || BookOpen;
                  const colorClass = strengthColors[subj.strength] || strengthColors.moderate;
                  return (
                    <div key={subj.subject} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{subj.subject}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>
                            {subj.strength}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${
                              subj.strength === 'strong' ? 'bg-green-500' :
                              subj.strength === 'weak' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} style={{ width: `${subj.avgConfidence * 100}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{Math.round(subj.avgConfidence * 100)}%</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{subj.totalQuestions} questions solved</p>
                      </div>
                      <button
                        onClick={() => handleStartPractice(subj.subject)}
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-purple-500"
                        title="Practice this subject"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                {(!weaknesses.subjects || weaknesses.subjects.length === 0) && (
                  <p className="text-center text-gray-500 py-4">Solve some questions first to see your subject analysis.</p>
                )}
              </div>
            </div>

            {/* Weak topics */}
            {weaknesses.weakTopics?.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Topics to Improve
                </h2>
                <div className="space-y-2">
                  {weaknesses.weakTopics.map((topic, i) => (
                    <div key={i}
                      className={`p-3 rounded-xl border ${priorityColors[topic.priority] || priorityColors.medium}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{topic.topic}</p>
                          <p className="text-xs text-gray-500">{topic.subject} - {topic.totalAttempts} attempts - {Math.round(topic.avgConfidence * 100)}% confidence</p>
                        </div>
                        <button
                          onClick={() => handleStartPractice(topic.subject, topic.topic)}
                          disabled={practiceLoading}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-medium hover:bg-purple-600 disabled:opacity-50"
                        >
                          <Play className="w-3 h-3" /> Practice
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generate study plan CTA */}
            <button
              onClick={handleGenerateStudyPlan}
              disabled={planLoading}
              className="w-full p-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl font-medium flex items-center justify-center gap-2 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50"
            >
              {planLoading ? (
                <><RefreshCw className="w-5 h-5 animate-spin" /> Generating your study plan...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Generate Personalized Study Plan</>
              )}
            </button>
          </div>
        )}

        {/* Practice tab */}
        {activeTab === 'practice' && (
          <div className="space-y-6">
            {!practice?.questions?.length ? (
              <div className="text-center py-16">
                <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                <h3 className="text-lg font-bold mb-2">No practice questions yet</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Go to the Weaknesses tab and click "Practice" on a topic to get started.
                </p>
                <button onClick={() => setActiveTab('weaknesses')}
                  className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium">
                  View Weaknesses
                </button>
              </div>
            ) : (
              <>
                {/* Progress indicator */}
                <div className="flex items-center gap-2">
                  {practice.questions.map((_, i) => (
                    <div key={i} className={`flex-1 h-1.5 rounded-full ${
                      i < currentQuestion ? 'bg-green-500' :
                      i === currentQuestion ? 'bg-purple-500' :
                      'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  ))}
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium">
                      Question {currentQuestion + 1} of {practice.questions.length}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      practice.questions[currentQuestion]?.difficulty === 'hard'
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-600'
                        : practice.questions[currentQuestion]?.difficulty === 'easy'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600'
                        : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600'
                    }`}>
                      {practice.questions[currentQuestion]?.difficulty || 'medium'}
                    </span>
                  </div>

                  <p className="text-base font-medium leading-relaxed mb-4">
                    {practice.questions[currentQuestion]?.question}
                  </p>

                  {practice.questions[currentQuestion]?.hint && !evaluation && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800 mb-4">
                      <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5" /> Hint: {practice.questions[currentQuestion].hint}
                      </p>
                    </div>
                  )}

                  {!evaluation ? (
                    <div className="space-y-3">
                      <textarea
                        value={userAnswer}
                        onChange={e => setUserAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleEvaluate}
                        disabled={evaluating || !userAnswer.trim()}
                        className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-purple-600 disabled:opacity-50"
                      >
                        {evaluating ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /> Evaluating...</>
                        ) : (
                          <><Send className="w-4 h-4" /> Check My Answer</>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Score */}
                      <div className={`p-4 rounded-xl ${
                        evaluation.correct
                          ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {evaluation.correct
                            ? <CheckCircle className="w-5 h-5 text-green-600" />
                            : <XCircle className="w-5 h-5 text-red-600" />
                          }
                          <span className="font-bold text-lg">
                            {evaluation.score || 0}%
                          </span>
                          <span className={`text-sm ${evaluation.correct ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                            {evaluation.correct ? 'Correct!' : 'Not quite right'}
                          </span>
                        </div>
                        {evaluation.feedback && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">{evaluation.feedback}</p>
                        )}
                      </div>

                      {evaluation.misconception && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Common misconception:</p>
                          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">{evaluation.misconception}</p>
                        </div>
                      )}

                      {evaluation.tip && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" /> Tip:
                          </p>
                          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{evaluation.tip}</p>
                        </div>
                      )}

                      {evaluation.correctAnswer && !evaluation.correct && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                          <p className="text-xs font-medium text-gray-500">Correct answer:</p>
                          <p className="text-sm mt-1">{evaluation.correctAnswer}</p>
                        </div>
                      )}

                      {currentQuestion < (practice?.questions?.length || 0) - 1 ? (
                        <button onClick={handleNextQuestion}
                          className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-purple-600">
                          Next Question <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-green-600 dark:text-green-400 font-medium mb-3">Practice session complete!</p>
                          <button onClick={() => handleStartPractice(practiceSubject, practiceTopic)}
                            disabled={practiceLoading}
                            className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 disabled:opacity-50">
                            {practiceLoading ? 'Generating...' : 'More Practice'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Study Plan tab */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            {!studyPlan ? (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                <h3 className="text-lg font-bold mb-2">No study plan yet</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Generate a personalized weekly study plan based on your weaknesses.
                </p>
                <button
                  onClick={handleGenerateStudyPlan}
                  disabled={planLoading}
                  className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 disabled:opacity-50"
                >
                  {planLoading ? 'Generating...' : 'Generate Study Plan'}
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                  <h2 className="text-lg font-bold mb-2">
                    Weekly Study Plan for {studyPlan.studentName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Class {studyPlan.grade} - {studyPlan.board} - Based on {studyPlan.basedOn?.weakTopicsCount || 0} weak topics
                  </p>

                  {studyPlan.plan?.motivationalTip && (
                    <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800">
                      <p className="text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> {studyPlan.plan.motivationalTip}
                      </p>
                    </div>
                  )}

                  {studyPlan.plan?.priorityTopics?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Priority Topics</p>
                      <div className="flex flex-wrap gap-2">
                        {studyPlan.plan.priorityTopics.map((t, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {studyPlan.plan?.weeklyPlan?.map((day, i) => (
                  <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold">{day.day}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                        ~{day.estimatedMinutes} min
                      </span>
                    </div>
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-3">
                      Focus: {day.focusSubject} - {day.focusTopic}
                    </p>
                    <div className="space-y-2">
                      {day.tasks?.map((task, j) => (
                        <div key={j} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                            task.type === 'practice' ? 'bg-blue-500' :
                            task.type === 'revise' ? 'bg-green-500' :
                            'bg-purple-500'
                          }`}>
                            {task.type?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{task.description}</p>
                          </div>
                          <span className="text-xs text-gray-400">{task.duration}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleGenerateStudyPlan}
                  disabled={planLoading}
                  className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-gray-500 font-medium hover:border-purple-400 hover:text-purple-500 transition-colors flex items-center justify-center gap-2"
                >
                  {planLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Regenerate Plan
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
