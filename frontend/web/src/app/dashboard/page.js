'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, Sun, Moon, Menu, ChevronRight,
  Flame, TrendingUp, Clock, Target,
  Zap, Search, Bell, ArrowRight, CheckCircle, XCircle,
  Crown, Sparkles, Calculator, Upload, Type, Loader2,
  LogOut, X
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('dm-token') : null;
}

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...opts.headers },
  });
  if (res.status === 401) {
    localStorage.removeItem('dm-token');
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API error');
  return data;
}

const subjectColors = {
  Mathematics: { bg: 'bg-teal-100 dark:bg-teal-500/10', text: 'text-teal-700 dark:text-teal-300' },
  Physics: { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300' },
  Chemistry: { bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300' },
  Biology: { bg: 'bg-pink-100 dark:bg-pink-500/10', text: 'text-pink-700 dark:text-pink-300' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [solveMode, setSolveMode] = useState('text');
  const [questionText, setQuestionText] = useState('');
  const [solving, setSolving] = useState(false);
  const [solution, setSolution] = useState(null);
  const [solveError, setSolveError] = useState('');
  const fileInputRef = useRef(null);

  // Data from API
  const [user, setUser] = useState(null);
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    loadDashboardData();
  }, []);

  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('dm-dark');
    if (saved === 'true') setDarkMode(true);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('dm-dark', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('dm-dark', 'false');
    }
  }, [darkMode]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, historyRes, streakRes] = await Promise.allSettled([
        apiFetch('/api/v1/user/profile'),
        apiFetch('/api/v1/questions/history?limit=5'),
        apiFetch('/api/v1/user/streak'),
      ]);
      if (profileRes.status === 'fulfilled') setUser(profileRes.value.user || profileRes.value);
      if (historyRes.status === 'fulfilled') setRecentQuestions(historyRes.value.questions || historyRes.value || []);
      if (streakRes.status === 'fulfilled') setStreak(streakRes.value.streak || 0);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== SOLVE TEXT =====
  const handleTextSolve = async () => {
    if (!questionText.trim() || solving) return;
    setSolving(true);
    setSolution(null);
    setSolveError('');
    try {
      const data = await apiFetch('/api/v1/questions/text-solve', {
        method: 'POST',
        body: JSON.stringify({ textQuestion: questionText.trim(), language: 'en' }),
      });
      setSolution(data.solution || data);
      setQuestionText('');
      loadDashboardData(); // refresh stats
    } catch (err) {
      setSolveError(err.message || 'Failed to solve. Please try again.');
    } finally {
      setSolving(false);
    }
  };

  // ===== SOLVE IMAGE =====
  const handleImageSolve = async (e) => {
    const file = e.target.files?.[0];
    if (!file || solving) return;
    setSolving(true);
    setSolution(null);
    setSolveError('');
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API}/api/v1/questions/solve`, {
        method: 'POST',
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to solve image');
      setSolution(data.solution || data);
      loadDashboardData();
    } catch (err) {
      setSolveError(err.message || 'Failed to process image. Please try again.');
    } finally {
      setSolving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dm-token');
    localStorage.removeItem('dm-refresh-token');
    router.push('/login');
  };

  const userName = user?.name?.split(' ')[0] || 'Student';
  const userPlan = user?.plan || 'free';
  const totalSolved = user?.total_questions || 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0F172A]">
        <Loader2 size={32} className="animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-[#0F172A]' : 'bg-gray-50'}`}>

      {/* ========== HEADER ========== */}
      <header className={`fixed top-0 w-full z-50 glass h-16 ${darkMode ? 'border-b border-slate-800' : 'border-b border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`lg:hidden p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Menu size={20} />
            </button>
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">D</span>
              </div>
              <span className={`font-bold text-lg hidden sm:block ${darkMode ? 'text-white' : 'text-gray-900'}`}>DoubtMaster</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${darkMode ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
              <Flame size={16} className="text-orange-500 animate-flicker" />
              <span className={`text-sm font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>{streak}</span>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg ${darkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'}`}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={handleLogout} className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'}`} title="Logout">
              <LogOut size={18} />
            </button>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${darkMode ? 'bg-teal-500/20 text-teal-300' : 'bg-teal-100 text-teal-600'}`}>
              {userName.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      {/* ========== MAIN ========== */}
      <main className="pt-20 pb-12 px-4 sm:px-6 max-w-7xl mx-auto">

        {/* Welcome */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Namaste, {userName}! <span className="inline-block animate-float text-2xl">&#128075;</span>
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {streak > 0 ? `You're on a ${streak}-day streak! Keep going!` : 'Ready to solve some doubts?'}
          </p>
        </div>

        {/* ========== SOLVE CARD ========== */}
        <div className={`rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden animate-fade-in-up delay-100 ${
          darkMode ? 'bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/20' : 'bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100'
        }`}>
          <div className="relative z-10">
            <h2 className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Solve a Doubt</h2>
            <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Snap a photo or type your question</p>

            <div className="flex gap-2 mb-4">
              <button onClick={() => setSolveMode('photo')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${solveMode === 'photo' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : (darkMode ? 'bg-slate-700 text-gray-300' : 'bg-white text-gray-600 border border-gray-200')}`}>
                <Camera size={16} /> Photo
              </button>
              <button onClick={() => setSolveMode('text')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${solveMode === 'text' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : (darkMode ? 'bg-slate-700 text-gray-300' : 'bg-white text-gray-600 border border-gray-200')}`}>
                <Type size={16} /> Type
              </button>
            </div>

            {solveMode === 'photo' ? (
              <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${darkMode ? 'border-slate-600 hover:border-teal-500/50' : 'border-gray-300 hover:border-teal-400'}`}>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSolve} />
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                  {solving ? <Loader2 size={28} className="text-white animate-spin" /> : <Camera size={28} className="text-white" />}
                </div>
                <p className={`font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {solving ? 'Analyzing your question...' : 'Tap to snap or upload a photo'}
                </p>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Supports handwritten & printed questions</p>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Type or paste your question here..."
                  rows={4}
                  className={`w-full rounded-xl p-4 text-sm outline-none resize-none transition-colors ${darkMode ? 'bg-slate-800 border border-slate-700 text-gray-200 placeholder-gray-500 focus:border-teal-500' : 'bg-white border border-gray-200 text-gray-700 placeholder-gray-400 focus:border-teal-400'}`}
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleTextSolve(); }}
                />
                <button
                  onClick={handleTextSolve}
                  disabled={solving || !questionText.trim()}
                  className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {solving ? <><Loader2 size={18} className="animate-spin" /> Solving...</> : <><Sparkles size={18} /> Solve with AI</>}
                </button>
              </div>
            )}

            {solveError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm">{solveError}</div>
            )}
          </div>
        </div>

        {/* ========== SOLUTION DISPLAY ========== */}
        {solution && (
          <div className={`rounded-2xl p-6 sm:p-8 mb-8 animate-fade-in-up ${darkMode ? 'bg-slate-800/50 border border-teal-500/30' : 'bg-white border-2 border-teal-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <Sparkles size={20} className="inline text-teal-500 mr-2" />Solution
              </h3>
              <button onClick={() => setSolution(null)} className={`p-1 rounded-lg ${darkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-400 hover:bg-gray-100'}`}>
                <X size={18} />
              </button>
            </div>
            {solution.question && (
              <div className={`mb-4 p-3 rounded-xl text-sm ${darkMode ? 'bg-slate-700/50 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                <strong>Q:</strong> {solution.question}
              </div>
            )}
            <div className={`prose prose-sm max-w-none ${darkMode ? 'prose-invert' : ''}`}>
              <div className={`whitespace-pre-wrap text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                {solution.steps ? (
                  solution.steps.map((step, i) => (
                    <div key={i} className={`mb-4 p-4 rounded-xl ${darkMode ? 'bg-slate-700/30' : 'bg-teal-50/50'}`}>
                      <div className="font-semibold text-teal-600 dark:text-teal-400 mb-1">Step {i + 1}</div>
                      <div>{step.explanation || step.content || step}</div>
                    </div>
                  ))
                ) : (
                  <div>{solution.explanation || solution.answer || solution.text || JSON.stringify(solution)}</div>
                )}
              </div>
              {solution.confidence && (
                <div className={`mt-4 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Confidence: {Math.round(solution.confidence * 100)}%
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== STATS ========== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Target, label: 'Questions Solved', value: totalSolved, color: 'text-teal-500', bg: darkMode ? 'bg-teal-500/10' : 'bg-teal-50' },
            { icon: Flame, label: 'Current Streak', value: `${streak} days`, color: 'text-orange-500', bg: darkMode ? 'bg-orange-500/10' : 'bg-orange-50' },
            { icon: TrendingUp, label: 'Plan', value: userPlan.charAt(0).toUpperCase() + userPlan.slice(1), color: 'text-emerald-500', bg: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50' },
            { icon: Crown, label: 'Member Since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Today', color: 'text-amber-500', bg: darkMode ? 'bg-amber-500/10' : 'bg-amber-50' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`rounded-2xl p-5 hover-card animate-fade-in-up ${darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'}`} style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.bg}`}>
                  <Icon size={20} className={stat.color} />
                </div>
                <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</div>
                <div className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* ========== RECENT QUESTIONS ========== */}
        <div className={`rounded-2xl p-6 mb-8 animate-fade-in-up delay-300 ${darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'}`}>
          <h3 className={`font-bold text-lg mb-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Recent Questions</h3>

          {recentQuestions.length === 0 ? (
            <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <Search size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No questions yet. Try solving your first doubt above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentQuestions.map((q) => {
                const sc = subjectColors[q.subject] || subjectColors.Mathematics;
                const timeAgo = q.created_at ? getTimeAgo(q.created_at) : '';
                return (
                  <div key={q.id} className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}>
                    <div className="mt-0.5 shrink-0 text-emerald-500">
                      <CheckCircle size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {q.question_text || q.question || 'Question'}
                      </p>
                      {q.subject && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${sc.bg} ${sc.text}`}>{q.subject}</span>
                      )}
                    </div>
                    <span className={`text-xs shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{timeAgo}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========== UPGRADE BANNER ========== */}
        {userPlan === 'free' && (
          <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-teal-500 to-emerald-600 relative overflow-hidden animate-fade-in-up delay-600">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Crown size={24} className="text-amber-300" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Upgrade to Pro</h3>
                  <p className="text-teal-200 text-sm">Unlimited solves, Learn Mode & more</p>
                </div>
              </div>
              <a href="/signup?plan=pro" className="shrink-0 bg-white text-teal-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-lg flex items-center gap-2">
                Upgrade Now <ArrowRight size={16} />
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
