'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, BookOpen, Brain, Sun, Moon, Menu, X, ChevronRight,
  Flame, TrendingUp, Clock, Star, Target, BarChart3,
  Zap, Search, Bell, Settings, LogOut, Home, FileText,
  Award, Calendar, ArrowRight, CheckCircle, XCircle,
  User, Crown, Sparkles, BookMarked, FlaskConical,
  Atom, Dna, Calculator, Upload, Type, AlertTriangle, RefreshCw
} from 'lucide-react';
import api from '../../lib/api';
import MathRenderer, { MathBlock } from '../../components/MathRenderer';

/* -------------------------------------------------- */
/* Subject badge color mapping                        */
/* -------------------------------------------------- */
const subjectColors = {
  Mathematics: { bg: 'bg-teal-100 dark:bg-teal-500/10', text: 'text-teal-700 dark:text-teal-300' },
  Physics: { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300' },
  Chemistry: { bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300' },
  Biology: { bg: 'bg-pink-100 dark:bg-pink-500/10', text: 'text-pink-700 dark:text-pink-300' },
};

const subjectIcons = {
  Mathematics: Calculator,
  Physics: Atom,
  Chemistry: FlaskConical,
  Biology: Dna,
};

const subjectGradients = {
  Mathematics: 'from-teal-500 to-emerald-500',
  Physics: 'from-blue-500 to-cyan-500',
  Chemistry: 'from-emerald-500 to-teal-500',
  Biology: 'from-pink-500 to-rose-500',
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/* -------------------------------------------------- */
/* Helpers                                             */
/* -------------------------------------------------- */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/* -------------------------------------------------- */
/* Dashboard Page                                      */
/* -------------------------------------------------- */
export default function DashboardPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [solveMode, setSolveMode] = useState('photo'); // 'photo' | 'text'

  // Solve state
  const [textQuestion, setTextQuestion] = useState('');
  const [isSolving, setIsSolving] = useState(false);
  const [solveError, setSolveError] = useState('');
  const [currentSolution, setCurrentSolution] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Learn Mode state
  const [learnModeResponse, setLearnModeResponse] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [showAllSteps, setShowAllSteps] = useState(false);

  // Real data states
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(null);
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [subscription, setSubscription] = useState(null);

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  /* ---- Fetch all dashboard data ---- */
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setDataError(null);

      const [meRes, progressRes, historyRes, subRes] = await Promise.allSettled([
        api.get('/api/v1/auth/me'),
        api.get('/api/v1/user/progress'),
        api.get('/api/v1/questions/history?limit=5'),
        api.get('/api/v1/subscriptions/status'),
      ]);

      // User profile is required -- if it fails, treat as fatal
      if (meRes.status === 'rejected') {
        throw meRes.reason;
      }
      setUser(meRes.value.user);

      // Progress (non-fatal)
      if (progressRes.status === 'fulfilled') {
        setProgress(progressRes.value);
      }

      // Recent questions (non-fatal)
      if (historyRes.status === 'fulfilled') {
        setRecentQuestions(historyRes.value.questions || []);
      }

      // Subscription (non-fatal)
      if (subRes.status === 'fulfilled') {
        setSubscription(subRes.value);
      }
    } catch (err) {
      // 401 is already handled by the api utility (redirects to login)
      if (err?.status !== 401) {
        setDataError(err?.message || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Auth guard + initial data fetch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('dm-token');
      if (!token) {
        router.replace('/login');
        return;
      }
      fetchDashboardData();
    }
  }, [router, fetchDashboardData]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Solve question via API
  const handleSolve = async () => {
    setSolveError('');
    setCurrentSolution(null);
    setEvaluation(null);
    setShowAllSteps(false);
    setLearnModeResponse('');

    if (solveMode === 'text') {
      if (!textQuestion.trim() || textQuestion.trim().length < 5) {
        setSolveError('Please enter a question (at least 5 characters)');
        return;
      }
      setIsSolving(true);
      try {
        const data = await api.post('/api/v1/questions/text-solve', { textQuestion: textQuestion.trim() });
        setCurrentSolution(data);
        // Refresh dashboard data to reflect the new question
        fetchDashboardData();
      } catch (err) {
        setSolveError(err.message || 'Something went wrong. Please try again.');
      } finally {
        setIsSolving(false);
      }
    } else {
      if (!selectedFile) {
        setSolveError('Please select an image first');
        return;
      }
      setIsSolving(true);
      try {
        const formData = new FormData();
        formData.append('image', selectedFile);
        const token = localStorage.getItem('dm-token');
        const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${BASE_URL}/api/v1/questions/solve`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.status === 401) {
          localStorage.removeItem('dm-token');
          router.replace('/login');
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Failed to solve');
        setCurrentSolution(data);
        fetchDashboardData();
      } catch (err) {
        setSolveError(err.message || 'Something went wrong. Please try again.');
      } finally {
        setIsSolving(false);
      }
    }
  };

  // Learn Mode submission
  const handleLearnModeSubmit = async () => {
    if (!currentSolution?.questionId || learnModeResponse.length < 10) return;
    setIsEvaluating(true);
    try {
      const data = await api.post(`/api/v1/questions/${currentSolution.questionId}/learn`, { response: learnModeResponse });
      setEvaluation(data);
      if (data.passed) setShowAllSteps(true);
    } catch {
      setEvaluation({ score: 0, passed: false, feedback: 'Error evaluating. Please try again.' });
    } finally {
      setIsEvaluating(false);
    }
  };

  /* ---- Derived values ---- */
  const userName = user?.name || 'Student';
  const userPlan = subscription?.plan || user?.plan || 'free';
  const streak = progress?.overall?.streak ?? user?.streak ?? 0;
  const totalSolved = progress?.overall?.totalSolved ?? user?.solve_count ?? 0;
  const accuracy = progress?.overall?.accuracy ?? 0;
  const todaySolved = progress?.dailyGoal?.completed ?? 0;
  const weakTopics = progress?.weakTopics || [];

  // Build weekly activity from progress data
  const weeklyActivity = DAY_LABELS.map((label, i) => ({
    label,
    count: progress?.weeklyActivity?.[i] ?? 0,
  }));
  const maxActivity = Math.max(...weeklyActivity.map(d => d.count), 1);

  // Build subject progress from bySubject counts
  const subjectProgress = Object.entries(progress?.bySubject || {}).map(([name, count]) => {
    const total = totalSolved || 1;
    return {
      name,
      icon: subjectIcons[name] || BookOpen,
      progress: Math.min(100, Math.round((count / total) * 100)),
      color: subjectGradients[name] || 'from-gray-500 to-gray-600',
      bg: subjectColors[name]?.bg || 'bg-gray-100 dark:bg-gray-500/10',
    };
  });

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading your dashboard...</p>
      </div>
    );
  }

  /* ---- Fatal error state (no user data) ---- */
  if (dataError && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle size={40} className="text-red-500" />
        <p className="text-lg font-semibold text-gray-800">{dataError}</p>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-[#0F172A]' : 'bg-gray-50'}`}>

      {/* ========== TOP HEADER ========== */}
      <header className={`fixed top-0 w-full z-50 glass h-16 ${darkMode ? 'border-b border-slate-800' : 'border-b border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`lg:hidden p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Menu size={20} />
            </button>
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">D</span>
              </div>
              <span className={`font-bold text-lg hidden sm:block ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                DoubtMaster
              </span>
            </a>
          </div>

          {/* Center: search (desktop only) */}
          <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl w-96 ${
            darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
          }`}>
            <Search size={16} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
            <input
              type="text"
              placeholder="Search questions, topics, chapters..."
              className={`bg-transparent outline-none text-sm w-full ${darkMode ? 'text-gray-200 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'}`}
            />
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Streak */}
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
              darkMode ? 'bg-orange-500/10' : 'bg-orange-50'
            }`}>
              <Flame size={16} className="text-orange-500 animate-flicker" />
              <span className={`text-sm font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>{streak}</span>
            </div>

            {/* Daily solve count */}
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
              darkMode ? 'bg-teal-500/10' : 'bg-teal-50'
            }`}>
              <Zap size={16} className="text-teal-500" />
              <span className={`text-sm font-bold ${darkMode ? 'text-teal-300' : 'text-teal-600'}`}>{todaySolved} today</span>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${darkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button className={`p-2 rounded-lg relative ${darkMode ? 'text-gray-300 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Bell size={18} />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              darkMode ? 'bg-teal-500/20 text-teal-300' : 'bg-teal-100 text-teal-600'
            }`}>
              {userName.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      {/* ========== MOBILE SIDEBAR OVERLAY ========== */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className={`absolute left-0 top-0 bottom-0 w-64 p-4 pt-20 animate-slide-in-left ${
            darkMode ? 'bg-slate-900' : 'bg-white'
          }`} onClick={(e) => e.stopPropagation()}>
            <nav className="space-y-1">
              {[
                { icon: Home, label: 'Dashboard', active: true },
                { icon: Camera, label: 'Solve', active: false },
                { icon: BookMarked, label: 'My Questions', active: false },
                { icon: BarChart3, label: 'Progress', active: false },
                { icon: FileText, label: 'Mock Tests', active: false },
                { icon: Settings, label: 'Settings', active: false },
              ].map(({ icon: Icon, label, active }) => (
                <a
                  key={label}
                  href="#"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                      : (darkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </a>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* ========== MAIN CONTENT ========== */}
      <main className="pt-20 pb-12 px-4 sm:px-6 max-w-7xl mx-auto">

        {/* Non-fatal error banner */}
        {dataError && user && (
          <div className={`mb-4 p-3 rounded-xl flex items-center gap-3 text-sm ${
            darkMode ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1">{dataError}</span>
            <button onClick={fetchDashboardData} className="shrink-0 underline font-medium">Retry</button>
          </div>
        )}

        {/* Welcome + Quick Solve */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Namaste, {userName.split(' ')[0]}! <span className="inline-block animate-float text-2xl">&#128075;</span>
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {streak > 0
              ? `Ready to solve some doubts? You've been on a ${streak}-day streak!`
              : "Ready to solve some doubts? Start your streak today!"}
          </p>
        </div>

        {/* ========== QUICK SOLVE CARD ========== */}
        <div className={`rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden animate-fade-in-up delay-100 ${
          darkMode ? 'bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/20' : 'bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100'
        }`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <h2 className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Solve a Doubt
            </h2>
            <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Snap a photo or type your question to get step-by-step solutions
            </p>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSolveMode('photo')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  solveMode === 'photo'
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                    : (darkMode ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200')
                }`}
              >
                <Camera size={16} /> Photo
              </button>
              <button
                onClick={() => setSolveMode('text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  solveMode === 'text'
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                    : (darkMode ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200')
                }`}
              >
                <Type size={16} /> Type
              </button>
            </div>

            {solveMode === 'photo' ? (
              <div>
                <label
                  htmlFor="photo-upload"
                  className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                    darkMode ? 'border-slate-600 hover:border-teal-500/50' : 'border-gray-300 hover:border-teal-400'
                  }`}
                >
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    className="hidden"
                    onChange={(e) => { setSelectedFile(e.target.files?.[0] || null); setSolveError(''); }}
                  />
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <Camera size={28} className="text-white" />
                  </div>
                  {selectedFile ? (
                    <p className={`font-medium mb-1 ${darkMode ? 'text-teal-300' : 'text-teal-700'}`}>
                      {selectedFile.name}
                    </p>
                  ) : (
                    <>
                      <p className={`font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Tap to snap or upload a photo
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Supports handwritten & printed questions in 11 languages
                      </p>
                    </>
                  )}
                </label>
                {selectedFile && (
                  <button
                    onClick={handleSolve}
                    disabled={isSolving}
                    className="mt-3 w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSolving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Solving...</> : <><Sparkles size={18} /> Solve with AI</>}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  placeholder="Type or paste your question here... (Hindi, English, or any supported language)"
                  rows={4}
                  value={textQuestion}
                  onChange={(e) => { setTextQuestion(e.target.value); setSolveError(''); }}
                  className={`w-full rounded-xl p-4 text-sm outline-none resize-none transition-colors ${
                    darkMode
                      ? 'bg-slate-800 border border-slate-700 text-gray-200 placeholder-gray-500 focus:border-teal-500'
                      : 'bg-white border border-gray-200 text-gray-700 placeholder-gray-400 focus:border-teal-400'
                  }`}
                />
                <button
                  onClick={handleSolve}
                  disabled={isSolving || !textQuestion.trim()}
                  className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSolving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Solving...</> : <><Sparkles size={18} /> Solve with AI</>}
                </button>
              </div>
            )}

            {/* Error message */}
            {solveError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                <p className="text-sm text-red-600 dark:text-red-400">{solveError}</p>
              </div>
            )}
          </div>
        </div>

        {/* ========== SOLUTION DISPLAY ========== */}
        {currentSolution && (
          <div className={`rounded-2xl p-6 sm:p-8 mb-8 animate-fade-in-up ${
            darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Question echo */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>Solution</h3>
                <div className="flex items-center gap-2">
                  {currentSolution.subject && (
                    <span className="text-xs px-2 py-1 rounded-full bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 font-medium">
                      {currentSolution.subject}
                    </span>
                  )}
                  <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {Math.round((currentSolution.confidence || 0.95) * 100)}% confidence
                  </span>
                </div>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {currentSolution.extractedText?.substring(0, 200)}
                {(currentSolution.extractedText?.length || 0) > 200 ? '...' : ''}
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-4 mb-6">
              {currentSolution.solution?.steps?.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border-l-4 border-teal-500 ${
                    darkMode ? 'bg-slate-700/50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">{step.stepNumber || idx + 1}</span>
                    </div>
                    <h4 className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {step.title}
                    </h4>
                  </div>
                  <div className={`text-sm ml-10 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <MathRenderer text={step.content} />
                  </div>
                  {step.formula && (
                    <div className={`ml-10 mt-2 p-3 rounded-lg text-sm overflow-x-auto ${
                      darkMode ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
                    }`}>
                      <MathBlock text={step.formula} />
                    </div>
                  )}
                  {step.explanation && (
                    <p className={`ml-10 mt-2 text-xs italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      <MathRenderer text={step.explanation} />
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Learn Mode gate for free users */}
            {currentSolution.solution?.learnModeRequired && !showAllSteps && (
              <div className={`p-5 rounded-xl border-2 mb-6 ${
                darkMode ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={20} className="text-indigo-500" />
                  <h4 className={`font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                    Learn Mode — Explain to unlock!
                  </h4>
                </div>
                <p className={`text-sm mb-3 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  You&apos;ve seen {currentSolution.solution.visibleSteps || currentSolution.solution.steps?.length} of {currentSolution.solution.totalSteps} steps.
                  Explain what you understood to unlock the full solution and final answer.
                </p>
                <textarea
                  placeholder="Type your understanding here... (min 10 characters)"
                  rows={3}
                  value={learnModeResponse}
                  onChange={(e) => setLearnModeResponse(e.target.value)}
                  className={`w-full rounded-xl p-3 text-sm outline-none resize-none mb-3 ${
                    darkMode
                      ? 'bg-slate-800 border border-slate-700 text-gray-200 placeholder-gray-500'
                      : 'bg-white border border-gray-200 text-gray-700 placeholder-gray-400'
                  }`}
                />
                <button
                  onClick={handleLearnModeSubmit}
                  disabled={learnModeResponse.length < 10 || isEvaluating}
                  className="bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isEvaluating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Evaluating...</> : 'Check Understanding'}
                </button>

                {evaluation && (
                  <div className={`mt-3 p-4 rounded-xl ${
                    evaluation.passed
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20'
                  }`}>
                    <p className={`font-bold text-sm ${evaluation.passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                      Score: {evaluation.score}% — {evaluation.passed ? 'Passed!' : 'Keep trying!'}
                    </p>
                    <p className={`text-sm mt-1 ${evaluation.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {evaluation.feedback}
                    </p>
                    {evaluation.hint && (
                      <p className={`text-xs mt-2 italic ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        Hint: {evaluation.hint}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Final Answer */}
            {(showAllSteps || !currentSolution.solution?.learnModeRequired) && currentSolution.solution?.finalAnswer && (
              <div className={`p-5 rounded-xl border-2 mb-4 ${
                darkMode ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'
              }`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  Final Answer
                </p>
                <div className={`text-lg font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                  <MathRenderer text={currentSolution.solution.finalAnswer} />
                </div>
              </div>
            )}

            {/* Concept Tags */}
            {currentSolution.solution?.conceptTags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {currentSolution.solution.conceptTags.map((tag, i) => (
                  <span key={i} className={`text-xs px-2.5 py-1 rounded-full ${
                    darkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Alternative Method */}
            {currentSolution.solution?.alternativeMethod && (
              <div className={`p-3 rounded-xl text-sm ${darkMode ? 'bg-slate-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                <span className="font-medium">Alternative method: </span>
                {currentSolution.solution.alternativeMethod}
              </div>
            )}

            {/* Solve another */}
            <button
              onClick={() => { setCurrentSolution(null); setTextQuestion(''); setSelectedFile(null); setEvaluation(null); setShowAllSteps(false); setLearnModeResponse(''); }}
              className={`mt-4 text-sm font-medium flex items-center gap-1 ${darkMode ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'}`}
            >
              <Sparkles size={14} /> Solve another question
            </button>
          </div>
        )}

        {/* ========== STATS GRID ========== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Target, label: 'Questions Solved', value: totalSolved, color: 'text-teal-500', bg: darkMode ? 'bg-teal-500/10' : 'bg-teal-50' },
            { icon: Flame, label: 'Current Streak', value: `${streak} days`, color: 'text-orange-500', bg: darkMode ? 'bg-orange-500/10' : 'bg-orange-50' },
            { icon: TrendingUp, label: 'Accuracy', value: `${accuracy}%`, color: 'text-emerald-500', bg: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50' },
            { icon: Brain, label: 'Weak Topics', value: weakTopics.length, color: 'text-pink-500', bg: darkMode ? 'bg-pink-500/10' : 'bg-pink-50' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`rounded-2xl p-5 hover-card animate-fade-in-up ${
                  darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
                }`}
                style={{ animationDelay: `${0.1 + i * 0.08}s` }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.bg}`}>
                  <Icon size={20} className={stat.color} />
                </div>
                <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</div>
                <div className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">

          {/* ========== RECENT QUESTIONS ========== */}
          <div className={`lg:col-span-2 rounded-2xl p-6 animate-fade-in-up delay-300 ${
            darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>Recent Questions</h3>
              <a href="#" className="text-teal-500 text-sm font-medium flex items-center gap-1 hover:underline">
                View All <ChevronRight size={14} />
              </a>
            </div>

            {recentQuestions.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No questions yet. Solve your first doubt!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentQuestions.map((q) => {
                  const sc = subjectColors[q.subject] || subjectColors.Mathematics;
                  return (
                    <div
                      key={q.id}
                      className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                        darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0 text-emerald-500">
                        <CheckCircle size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {q.extractedText || 'Question'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {q.subject && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                              {q.subject}
                            </span>
                          )}
                          {q.topic && (
                            <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{q.topic}</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {timeAgo(q.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========== WEEKLY ACTIVITY ========== */}
          <div className={`rounded-2xl p-6 animate-fade-in-up delay-400 ${
            darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
          }`}>
            <h3 className={`font-bold text-lg mb-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Weekly Activity</h3>

            <div className="flex items-end justify-between gap-2 h-40 mb-4">
              {weeklyActivity.map((day, idx) => {
                const height = maxActivity > 0 ? (day.count / maxActivity) * 100 : 0;
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                    <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{day.count}</span>
                    <div className={`w-full rounded-t-lg transition-all animate-progress ${
                      darkMode ? 'bg-slate-700' : 'bg-gray-100'
                    }`} style={{ height: '100%', position: 'relative' }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-t-lg bg-gradient-to-t from-teal-500 to-emerald-500"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{day.label}</span>
                  </div>
                );
              })}
            </div>

            <div className={`text-center pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-100'}`}>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {weeklyActivity.reduce((s, d) => s + d.count, 0)}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Questions this week</div>
            </div>
          </div>
        </div>

        {/* ========== SUBJECT PROGRESS ========== */}
        <div className={`rounded-2xl p-6 mb-8 animate-fade-in-up delay-500 ${
          darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
        }`}>
          <h3 className={`font-bold text-lg mb-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Subject Progress</h3>

          {subjectProgress.length === 0 ? (
            <div className={`text-center py-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <BarChart3 size={28} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Solve questions to see your subject breakdown.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {subjectProgress.map((subject) => {
                const Icon = subject.icon;
                return (
                  <div key={subject.name} className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${subject.bg}`}>
                      <Icon size={20} style={{ color: subject.color.includes('teal') ? '#0D9488' : subject.color.includes('blue') ? '#3B82F6' : subject.color.includes('emerald') ? '#10B981' : subject.color.includes('pink') ? '#EC4899' : '#6B7280' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{subject.name}</span>
                        <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>{subject.progress}%</span>
                      </div>
                      <div className={`h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${subject.color} animate-progress`}
                          style={{ width: `${subject.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========== UPGRADE BANNER (for free users) ========== */}
        {userPlan === 'free' && (
          <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-teal-500 to-emerald-600 relative overflow-hidden animate-fade-in-up delay-600">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Crown size={24} className="text-amber-300" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Upgrade to Pro (Topper)</h3>
                  <p className="text-teal-200 text-sm">
                    Unlimited JEE/NEET solves, Learn Mode, offline access & more -- just &#8377;49/month
                  </p>
                </div>
              </div>
              <a
                href="/signup?plan=pro"
                className="shrink-0 bg-white text-teal-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-lg flex items-center gap-2"
              >
                Upgrade Now <ArrowRight size={16} />
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
