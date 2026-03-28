'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sun, Moon, ArrowLeft, Target, Flame, TrendingUp, Award,
  BarChart3, BookOpen, AlertTriangle, RefreshCw,
  Calculator, Atom, FlaskConical, Dna, CheckCircle
} from 'lucide-react';
import api from '../../lib/api';

/* -------------------------------------------------- */
/* Subject styling (matches dashboard)                */
/* -------------------------------------------------- */
const subjectColors = {
  Mathematics: { bg: 'bg-teal-100 dark:bg-teal-500/10', text: 'text-teal-700 dark:text-teal-300', bar: 'from-teal-500 to-emerald-500' },
  Physics:     { bg: 'bg-blue-100 dark:bg-blue-500/10',  text: 'text-blue-700 dark:text-blue-300',  bar: 'from-blue-500 to-cyan-500' },
  Chemistry:   { bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', bar: 'from-emerald-500 to-teal-500' },
  Biology:     { bg: 'bg-pink-100 dark:bg-pink-500/10',  text: 'text-pink-700 dark:text-pink-300',  bar: 'from-pink-500 to-rose-500' },
};

const subjectIcons = {
  Mathematics: Calculator,
  Physics: Atom,
  Chemistry: FlaskConical,
  Biology: Dna,
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* -------------------------------------------------- */
/* Progress Page                                       */
/* -------------------------------------------------- */
export default function ProgressPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/api/v1/user/progress');
      setProgress(data);
    } catch (err) {
      if (err?.status !== 401) {
        setError(err?.message || 'Failed to load progress data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Auth guard + fetch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('dm-token');
      if (!token) {
        router.replace('/login');
        return;
      }
      // Restore dark mode preference
      const savedDark = localStorage.getItem('dm-dark');
      if (savedDark === 'true') setDarkMode(true);
      fetchProgress();
    }
  }, [router, fetchProgress]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('dm-dark', String(darkMode));
    }
  }, [darkMode]);

  /* ---- Derived values ---- */
  const overall = progress?.overall || {};
  const totalSolved = overall.totalSolved ?? 0;
  const streak = overall.streak ?? 0;
  const accuracy = overall.accuracy ?? 0;
  const bestStreak = overall.bestStreak ?? 0;

  const weeklyActivity = DAY_LABELS.map((label, i) => ({
    label,
    count: progress?.weeklyActivity?.[i] ?? 0,
  }));
  const maxActivity = Math.max(...weeklyActivity.map(d => d.count), 1);
  const weeklyTotal = weeklyActivity.reduce((s, d) => s + d.count, 0);

  const bySubject = progress?.bySubject || {};
  const subjectEntries = Object.entries(bySubject);
  const maxSubjectCount = Math.max(...subjectEntries.map(([, c]) => c), 1);

  const weakTopics = progress?.weakTopics || [];
  const dailyGoal = progress?.dailyGoal || { target: 10, completed: 0 };
  const goalPct = dailyGoal.target > 0 ? Math.min(100, Math.round((dailyGoal.completed / dailyGoal.target) * 100)) : 0;

  /* ---- SVG progress ring helpers ---- */
  const ringRadius = 54;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (goalPct / 100) * ringCircumference;

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading your progress...</p>
      </div>
    );
  }

  /* ---- Fatal error state ---- */
  if (error && !progress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle size={40} className="text-red-500" />
        <p className="text-lg font-semibold text-gray-800">{error}</p>
        <button
          onClick={fetchProgress}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-[#0F172A]' : 'bg-gray-50'}`}>

      {/* ========== HEADER ========== */}
      <header className={`fixed top-0 w-full z-50 backdrop-blur-xl h-16 ${
        darkMode ? 'bg-slate-900/80 border-b border-slate-800' : 'bg-white/80 border-b border-gray-200'
      }`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">D</span>
              </div>
              <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Progress
              </span>
            </div>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg ${darkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* ========== MAIN CONTENT ========== */}
      <main className="pt-20 pb-12 px-4 sm:px-6 max-w-5xl mx-auto">

        {/* Non-fatal error banner */}
        {error && progress && (
          <div className={`mb-4 p-3 rounded-xl flex items-center gap-3 text-sm ${
            darkMode ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={fetchProgress} className="shrink-0 underline font-medium">Retry</button>
          </div>
        )}

        {/* ========== STATS OVERVIEW ========== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Target,     label: 'Total Solved',  value: totalSolved,         color: 'text-teal-500',    bg: darkMode ? 'bg-teal-500/10' : 'bg-teal-50' },
            { icon: Flame,      label: 'Current Streak', value: `${streak} days`,    color: 'text-orange-500',  bg: darkMode ? 'bg-orange-500/10' : 'bg-orange-50' },
            { icon: TrendingUp, label: 'Accuracy',       value: `${accuracy}%`,      color: 'text-emerald-500', bg: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50' },
            { icon: Award,      label: 'Best Streak',    value: `${bestStreak} days`, color: 'text-purple-500',  bg: darkMode ? 'bg-purple-500/10' : 'bg-purple-50' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`rounded-2xl p-5 transition-transform hover:scale-[1.02] ${
                  darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
                }`}
                style={{ animationDelay: `${0.05 + i * 0.08}s` }}
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

        <div className="grid lg:grid-cols-2 gap-6 mb-8">

          {/* ========== WEEKLY ACTIVITY (bigger) ========== */}
          <div className={`rounded-2xl p-6 ${
            darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>Weekly Activity</h3>
              <div className={`text-sm font-semibold px-3 py-1 rounded-lg ${
                darkMode ? 'bg-teal-500/10 text-teal-300' : 'bg-teal-50 text-teal-600'
              }`}>
                {weeklyTotal} this week
              </div>
            </div>

            <div className="flex items-end justify-between gap-3 h-52 mb-4">
              {weeklyActivity.map((day, idx) => {
                const height = maxActivity > 0 ? (day.count / maxActivity) * 100 : 0;
                const isToday = idx === new Date().getDay();
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                    <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{day.count}</span>
                    <div className={`w-full rounded-xl transition-all ${
                      darkMode ? 'bg-slate-700' : 'bg-gray-100'
                    }`} style={{ height: '100%', position: 'relative' }}>
                      <div
                        className={`absolute bottom-0 left-0 right-0 rounded-xl transition-all duration-700 ${
                          isToday
                            ? 'bg-gradient-to-t from-teal-400 to-emerald-400 shadow-lg shadow-teal-500/20'
                            : 'bg-gradient-to-t from-teal-500 to-emerald-500'
                        }`}
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      isToday
                        ? (darkMode ? 'text-teal-400' : 'text-teal-600')
                        : (darkMode ? 'text-gray-500' : 'text-gray-400')
                    }`}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========== DAILY GOAL RING ========== */}
          <div className={`rounded-2xl p-6 flex flex-col items-center justify-center ${
            darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
          }`}>
            <h3 className={`font-bold text-lg mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Daily Goal</h3>

            <div className="relative w-40 h-40 mb-5">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                {/* Background ring */}
                <circle
                  cx="60" cy="60" r={ringRadius}
                  fill="none"
                  stroke={darkMode ? '#334155' : '#E5E7EB'}
                  strokeWidth="10"
                />
                {/* Progress ring */}
                <circle
                  cx="60" cy="60" r={ringRadius}
                  fill="none"
                  stroke="url(#goalGradient)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#14B8A6" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{dailyGoal.completed}</span>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>of {dailyGoal.target}</span>
              </div>
            </div>

            <p className={`text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {goalPct >= 100
                ? 'Goal achieved! Great job!'
                : `${dailyGoal.target - dailyGoal.completed} more to reach your daily goal`}
            </p>

            {goalPct >= 100 && (
              <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <CheckCircle size={16} className="text-emerald-500" />
                <span className={`text-sm font-medium ${darkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>Completed!</span>
              </div>
            )}
          </div>
        </div>

        {/* ========== SUBJECT BREAKDOWN ========== */}
        <div className={`rounded-2xl p-6 mb-8 ${
          darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
        }`}>
          <h3 className={`font-bold text-lg mb-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Subject Breakdown</h3>

          {subjectEntries.length === 0 ? (
            <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Solve questions to see your subject breakdown.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {subjectEntries.map(([name, count]) => {
                const pct = Math.round((count / maxSubjectCount) * 100);
                const sc = subjectColors[name] || { bg: 'bg-gray-100 dark:bg-gray-500/10', text: 'text-gray-600 dark:text-gray-300', bar: 'from-gray-500 to-gray-600' };
                const Icon = subjectIcons[name] || BookOpen;
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${sc.bg}`}>
                          <Icon size={18} className={sc.text.split(' ')[0]} />
                        </div>
                        <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{name}</span>
                      </div>
                      <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>{count} solved</span>
                    </div>
                    <div className={`h-3 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${sc.bar} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========== WEAK TOPICS ========== */}
        {weakTopics.length > 0 && (
          <div className={`rounded-2xl p-6 mb-8 ${
            darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
          }`}>
            <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Weak Topics</h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Focus on these topics to improve your accuracy.
            </p>
            <div className="flex flex-wrap gap-2">
              {weakTopics.map((topic, i) => (
                <span
                  key={i}
                  className={`text-sm px-3 py-1.5 rounded-xl font-medium ${
                    darkMode ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ========== BACK LINK ========== */}
        <div className="text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className={`text-sm font-medium inline-flex items-center gap-1.5 transition-colors ${
              darkMode ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'
            }`}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
