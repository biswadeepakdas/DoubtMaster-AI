'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Clock, BookOpen, Calculator, Atom, FlaskConical, Dna,
  Timer, ChevronLeft, ChevronRight, CheckCircle, XCircle, RotateCcw,
  Play, Sun, Moon, Loader2, AlertTriangle, Trophy, Target,
} from 'lucide-react';
import api from '../../lib/api';
import MathRenderer from '../../components/MathRenderer';

// ─── Subject icon/color mapping ───
const SUBJECT_META = {
  math: { icon: Calculator, color: 'text-teal-500', bg: 'bg-teal-500/10', gradient: 'from-teal-500 to-emerald-500' },
  physics: { icon: Atom, color: 'text-blue-500', bg: 'bg-blue-500/10', gradient: 'from-blue-500 to-cyan-500' },
  chemistry: { icon: FlaskConical, color: 'text-emerald-500', bg: 'bg-emerald-500/10', gradient: 'from-emerald-500 to-green-500' },
  biology: { icon: Dna, color: 'text-pink-500', bg: 'bg-pink-500/10', gradient: 'from-pink-500 to-rose-500' },
};

// ─── Screens ───
const SCREEN = { SELECT: 'select', TAKING: 'taking', RESULTS: 'results' };

export default function MockTestsPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [screen, setScreen] = useState(SCREEN.SELECT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Test selection
  const [tests, setTests] = useState([]);
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterClass, setFilterClass] = useState('all');

  // Test taking
  const [testSession, setTestSession] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const timerRef = useRef(null);

  // Results
  const [results, setResults] = useState(null);

  // ─── Auth guard ───
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('dm-token');
      if (!token) router.replace('/login');
    }
  }, [router]);

  // ─── Dark mode ───
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // ─── Fetch available tests ───
  useEffect(() => {
    api.get('/api/v1/mock-tests/available')
      .then((data) => setTests(data.tests || []))
      .catch((err) => setError(err.message || 'Failed to load tests'));
  }, []);

  // ─── Timer ───
  useEffect(() => {
    if (screen !== SCREEN.TAKING || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen, timeLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Filtered tests ───
  const filteredTests = tests.filter((t) => {
    if (filterSubject !== 'all' && t.subject !== filterSubject) return false;
    if (filterClass !== 'all' && String(t.class) !== filterClass) return false;
    return true;
  });

  // ─── Start test ───
  const handleStart = async (testId) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/api/v1/mock-tests/start', { testId });
      setTestSession(data);
      setAnswers({});
      setCurrentQ(0);
      setTimeLeft(data.durationMinutes * 60);
      setScreen(SCREEN.TAKING);
    } catch (err) {
      setError(err.message || 'Failed to start test');
    } finally {
      setLoading(false);
    }
  };

  // ─── Submit test ───
  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (!testSession) return;
    clearInterval(timerRef.current);
    setShowConfirm(false);
    setLoading(true);
    setError('');
    try {
      const data = await api.post(`/api/v1/mock-tests/${testSession.sessionId}/submit`, {
        answers: Object.fromEntries(
          Object.entries(answers).map(([k, v]) => [String(k), v])
        ),
      });
      setResults(data);
      setScreen(SCREEN.RESULTS);
    } catch (err) {
      setError(err.message || 'Failed to submit test');
      // If auto-submit failed, give user a chance to retry
      if (!autoSubmit) setScreen(SCREEN.TAKING);
    } finally {
      setLoading(false);
    }
  }, [testSession, answers]);

  // ─── Answer selection ───
  const selectAnswer = (questionIndex, option) => {
    setAnswers((prev) => ({ ...prev, [String(questionIndex)]: option }));
  };

  // ─── Format time ───
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatTimeTaken = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  // ─── Shared styles ───
  const cardClass = darkMode
    ? 'bg-slate-800/50 border border-slate-700 hover:border-slate-600'
    : 'bg-white border border-gray-200 hover:border-gray-300';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-500';
  const textMuted = darkMode ? 'text-gray-500' : 'text-gray-500';

  // ═══════════════════════════════════════════
  //  RENDER: TEST SELECTION
  // ═══════════════════════════════════════════
  const renderSelection = () => {
    const subjects = [...new Set(tests.map((t) => t.subject))];
    const classes = [...new Set(tests.map((t) => String(t.class)))].sort();

    return (
      <>
        {/* Page title */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-teal-500/10' : 'bg-teal-50'}`}>
              <Target size={22} className="text-teal-500" />
            </div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${textPrimary}`}>Mock Tests</h1>
          </div>
          <p className={`text-sm mt-1 ${textSecondary}`}>
            Practice with AI-generated tests tailored to your board and class.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 animate-fade-in-up">
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors outline-none ${
              darkMode
                ? 'bg-slate-800 border border-slate-700 text-gray-200'
                : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors outline-none ${
              darkMode
                ? 'bg-slate-800 border border-slate-700 text-gray-200'
                : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>
        </div>

        {/* Test grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
          {filteredTests.map((test) => {
            const meta = SUBJECT_META[test.subject] || SUBJECT_META.math;
            const Icon = meta.icon;
            return (
              <div
                key={test.id}
                className={`rounded-2xl p-5 transition-all ${cardClass}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${meta.bg}`}>
                  <Icon size={20} className={meta.color} />
                </div>
                <h3 className={`font-semibold text-sm mb-1 ${textPrimary}`}>{test.title}</h3>
                <div className={`flex items-center gap-3 text-xs mb-4 ${textMuted}`}>
                  <span className="flex items-center gap-1"><BookOpen size={12} />{test.questionCount} Qs</span>
                  <span className="flex items-center gap-1"><Clock size={12} />{test.durationMinutes} min</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                    darkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>{test.board}</span>
                </div>
                <button
                  onClick={() => handleStart(test.id)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  Start Test
                </button>
              </div>
            );
          })}
        </div>

        {filteredTests.length === 0 && !loading && (
          <div className={`text-center py-12 ${textSecondary}`}>
            No tests match your filters. Try adjusting them.
          </div>
        )}
      </>
    );
  };

  // ═══════════════════════════════════════════
  //  RENDER: TEST TAKING
  // ═══════════════════════════════════════════
  const renderTaking = () => {
    if (!testSession) return null;
    const { questions, title, durationMinutes } = testSession;
    const question = questions[currentQ];
    const optionLabels = ['A', 'B', 'C', 'D'];
    const isUrgent = timeLeft < 60;
    const answeredCount = Object.keys(answers).length;

    return (
      <>
        {/* Timer bar */}
        <div className={`fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 sm:px-6 ${
          darkMode ? 'bg-slate-900/95 border-b border-slate-800' : 'bg-white/95 border-b border-gray-200'
        } backdrop-blur-sm`}>
          <div className={`text-sm font-medium ${textPrimary} truncate max-w-[40%]`}>{title}</div>
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-mono text-sm font-bold ${
            isUrgent
              ? 'bg-red-500/10 text-red-500 animate-pulse'
              : darkMode ? 'bg-slate-800 text-teal-400' : 'bg-teal-50 text-teal-600'
          }`}>
            <Timer size={16} />
            {formatTime(timeLeft)}
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-1.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-lg transition-all"
          >
            Submit ({answeredCount}/{questions.length})
          </button>
        </div>

        <div className="pt-20 max-w-3xl mx-auto animate-fade-in-up">
          {/* Question number pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {questions.map((q, i) => {
              const isActive = i === currentQ;
              const isAnswered = answers[String(q.index ?? i)] !== undefined;
              let pillClass;
              if (isActive) {
                pillClass = 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20';
              } else if (isAnswered) {
                pillClass = darkMode
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'bg-teal-50 text-teal-600 border border-teal-200';
              } else {
                pillClass = darkMode
                  ? 'bg-slate-800 text-gray-400 border border-slate-700'
                  : 'bg-gray-100 text-gray-500 border border-gray-200';
              }
              return (
                <button
                  key={q.index ?? i}
                  onClick={() => setCurrentQ(i)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${pillClass}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Question card */}
          <div className={`rounded-2xl p-6 sm:p-8 mb-6 ${
            darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
          }`}>
            <div className={`text-xs font-semibold mb-3 ${textMuted}`}>
              Question {currentQ + 1} of {questions.length}
              {question.topic && <span className="ml-2 opacity-60">| {question.topic}</span>}
              {question.difficulty && (
                <span className={`ml-2 px-2 py-0.5 rounded-full ${
                  question.difficulty === 'easy' ? 'bg-green-500/10 text-green-500' :
                  question.difficulty === 'hard' ? 'bg-red-500/10 text-red-500' :
                  'bg-yellow-500/10 text-yellow-500'
                }`}>{question.difficulty}</span>
              )}
            </div>

            <div className={`text-base sm:text-lg font-medium mb-6 leading-relaxed ${textPrimary}`}>
              <MathRenderer text={question.question} />
            </div>

            {/* Options */}
            <div className="space-y-3">
              {question.options.map((option, i) => {
                const label = optionLabels[i];
                const qIdx = question.index ?? currentQ;
                const isSelected = answers[String(qIdx)] === i;
                return (
                  <button
                    key={label}
                    onClick={() => selectAnswer(qIdx, i)}
                    className={`w-full text-left flex items-start gap-3 p-4 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-2 border-teal-500 shadow-sm'
                        : darkMode
                          ? 'bg-slate-800 border border-slate-700 hover:border-slate-500'
                          : 'bg-gray-50 border border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isSelected
                        ? 'bg-teal-500 text-white'
                        : darkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {label}
                    </span>
                    <span className={`pt-1 text-sm ${isSelected ? (darkMode ? 'text-teal-300' : 'text-teal-700') : textPrimary}`}>
                      <MathRenderer text={option} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prev / Next */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0}
              className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-30 ${
                darkMode ? 'bg-slate-800 text-gray-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}
              disabled={currentQ === questions.length - 1}
              className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-30 ${
                darkMode ? 'bg-slate-800 text-gray-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={`rounded-2xl p-6 sm:p-8 max-w-sm w-full mx-4 ${
              darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
            }`}>
              <AlertTriangle size={32} className="text-amber-500 mx-auto mb-4" />
              <h3 className={`text-lg font-bold text-center mb-2 ${textPrimary}`}>Submit Test?</h3>
              <p className={`text-sm text-center mb-6 ${textSecondary}`}>
                You have answered {answeredCount} of {questions.length} questions.
                {answeredCount < questions.length && ' Unanswered questions will be marked wrong.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium ${
                    darkMode ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-lg transition-all"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // ═══════════════════════════════════════════
  //  RENDER: RESULTS
  // ═══════════════════════════════════════════
  const renderResults = () => {
    if (!results) return null;
    const { score: percentage, correct: score, total, questions: questionResults } = results;

    // Score ring color
    const ringColor = percentage >= 80 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500';
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="max-w-3xl mx-auto animate-fade-in-up">
        {/* Score card */}
        <div className={`rounded-2xl p-8 sm:p-10 mb-8 text-center ${
          darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
        }`}>
          <Trophy size={32} className="text-teal-500 mx-auto mb-4" />
          <h2 className={`text-2xl font-bold mb-6 ${textPrimary}`}>Test Complete!</h2>

          {/* Score ring */}
          <div className="relative w-36 h-36 mx-auto mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" strokeWidth="8"
                className={darkMode ? 'stroke-slate-700' : 'stroke-gray-200'} />
              <circle cx="60" cy="60" r="54" fill="none" strokeWidth="8"
                strokeLinecap="round"
                className={ringColor.replace('text-', 'stroke-')}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${textPrimary}`}>{percentage}%</span>
              <span className={`text-xs ${textMuted}`}>{score}/{total}</span>
            </div>
          </div>

          <div className={`flex items-center justify-center gap-1 text-sm ${textSecondary}`}>
            <Trophy size={14} />
            {score} correct out of {total}
          </div>
        </div>

        {/* Question breakdown */}
        <h3 className={`font-bold text-lg mb-4 ${textPrimary}`}>Question Breakdown</h3>
        <div className="space-y-3 mb-8">
          {questionResults.map((r, i) => {
            const optionLabels = ['A', 'B', 'C', 'D'];
            const correctLabel = optionLabels[r.correctIndex] ?? '';
            const userLabel = r.selectedIndex != null ? (optionLabels[r.selectedIndex] ?? '') : null;
            return (
              <div
                key={r.index ?? i}
                className={`rounded-2xl p-5 ${
                  darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                    r.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {r.isCorrect
                      ? <CheckCircle size={18} className="text-green-500" />
                      : <XCircle size={18} className="text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium mb-2 ${textPrimary}`}>
                      <span className={textMuted}>Q{i + 1}. </span>
                      <MathRenderer text={r.question} />
                    </div>

                    {/* Options summary */}
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      {r.options.map((opt, oi) => {
                        const label = optionLabels[oi];
                        const isUser = r.selectedIndex === oi;
                        const isCorrect = r.correctIndex === oi;
                        let optClass = darkMode ? 'bg-slate-800 text-gray-400' : 'bg-gray-50 text-gray-500';
                        if (isCorrect) optClass = 'bg-green-500/10 text-green-600 font-semibold';
                        if (isUser && !r.isCorrect) optClass = 'bg-red-500/10 text-red-500 line-through';
                        if (isUser && r.isCorrect) optClass = 'bg-green-500/10 text-green-600 font-semibold';
                        return (
                          <div key={label} className={`px-3 py-1.5 rounded-lg text-xs ${optClass}`}>
                            <span className="font-bold mr-1">{label}.</span>
                            <MathRenderer text={opt} />
                          </div>
                        );
                      })}
                    </div>

                    {!r.isCorrect && (
                      <div className={`text-xs ${textSecondary}`}>
                        <span className="font-semibold text-green-500">Correct: {correctLabel}</span>
                        {userLabel
                          ? <span className="ml-2 text-red-400">Your answer: {userLabel}</span>
                          : <span className="ml-2 text-red-400">Not answered</span>
                        }
                      </div>
                    )}

                    {r.explanation && !r.isCorrect && (
                      <div className={`mt-2 text-xs p-3 rounded-lg ${
                        darkMode ? 'bg-slate-800 text-gray-400' : 'bg-blue-50 text-blue-700'
                      }`}>
                        <MathRenderer text={r.explanation} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => {
              setResults(null);
              setTestSession(null);
              setScreen(SCREEN.SELECT);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-teal-500/25 transition-all"
          >
            <RotateCcw size={16} /> Try Another Test
          </button>
          <a
            href="/dashboard"
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              darkMode ? 'bg-slate-800 text-gray-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════
  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-[#0F172A]' : 'bg-gray-50'}`}>

      {/* Error toast */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium shadow-lg animate-fade-in-up">
          {error}
          <button onClick={() => setError('')} className="ml-3 opacity-70 hover:opacity-100">&times;</button>
        </div>
      )}

      {/* Loading overlay */}
      {loading && screen !== SCREEN.TAKING && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className={`rounded-2xl p-8 flex flex-col items-center gap-4 ${
            darkMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            <Loader2 size={32} className="animate-spin text-teal-500" />
            <p className={`text-sm font-medium ${textPrimary}`}>
              {screen === SCREEN.SELECT ? 'Generating your test with AI...' : 'Grading your test...'}
            </p>
          </div>
        </div>
      )}

      {/* Header (selection & results screens only) */}
      {screen !== SCREEN.TAKING && (
        <header className={`fixed top-0 w-full z-50 glass h-16 ${darkMode ? 'border-b border-slate-800' : 'border-b border-gray-200'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
            <a href="/dashboard" className={`flex items-center gap-2 text-sm font-medium ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </a>
            <a href="/" className="flex items-center gap-2">
              <img src="/logo-icon.jpg" alt="DoubtMaster AI" className="w-8 h-8 rounded-lg object-cover" />
              <span className={`font-bold text-lg hidden sm:block ${textPrimary}`}>DoubtMaster</span>
            </a>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${darkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className={`${screen === SCREEN.TAKING ? 'pt-4 pb-8' : 'pt-24 pb-16'} px-4 sm:px-6 max-w-5xl mx-auto`}>
        {screen === SCREEN.SELECT && renderSelection()}
        {screen === SCREEN.TAKING && renderTaking()}
        {screen === SCREEN.RESULTS && renderResults()}
      </main>
    </div>
  );
}
