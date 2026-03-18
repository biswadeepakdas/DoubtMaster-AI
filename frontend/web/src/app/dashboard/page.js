'use client';

import { useState, useEffect } from 'react';
import {
  Camera, BookOpen, Brain, Sun, Moon, Menu, X, ChevronRight,
  Flame, TrendingUp, Clock, Star, Target, BarChart3,
  Zap, Search, Bell, Settings, LogOut, Home, FileText,
  Award, Calendar, ArrowRight, CheckCircle, XCircle,
  User, Crown, Sparkles, BookMarked, FlaskConical,
  Atom, Dna, Calculator, Upload, Type
} from 'lucide-react';

/* -------------------------------------------------- */
/* Mock data                                           */
/* -------------------------------------------------- */
const mockUser = {
  name: 'Arjun Sharma',
  avatar: null,
  plan: 'free',
  streak: 12,
  todaySolved: 7,
  totalSolved: 342,
  accuracy: 87,
  joinedDays: 45,
};

const mockRecentQuestions = [
  { id: 1, question: 'Find the derivative of f(x) = x^3 + 2x^2 - 5x + 1', subject: 'Mathematics', chapter: 'Ch 5 - Derivatives', time: '2 min ago', status: 'correct' },
  { id: 2, question: 'Balance the equation: Fe + O2 -> Fe2O3', subject: 'Chemistry', chapter: 'Ch 1 - Chemical Reactions', time: '15 min ago', status: 'correct' },
  { id: 3, question: 'Explain the process of mitosis with diagrams', subject: 'Biology', chapter: 'Ch 10 - Cell Division', time: '1 hour ago', status: 'partial' },
  { id: 4, question: 'A block of mass 5kg on a frictionless surface...', subject: 'Physics', chapter: "Ch 5 - Newton's Laws", time: '2 hours ago', status: 'correct' },
  { id: 5, question: 'Solve: 2sin(x) + 1 = 0 for 0 <= x <= 2pi', subject: 'Mathematics', chapter: 'Ch 3 - Trigonometry', time: '3 hours ago', status: 'incorrect' },
];

const subjectProgress = [
  { name: 'Mathematics', icon: Calculator, progress: 72, color: 'from-teal-500 to-emerald-500', bg: 'bg-teal-100 dark:bg-teal-500/10' },
  { name: 'Physics', icon: Atom, progress: 58, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-100 dark:bg-blue-500/10' },
  { name: 'Chemistry', icon: FlaskConical, progress: 85, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-100 dark:bg-emerald-500/10' },
  { name: 'Biology', icon: Dna, progress: 43, color: 'from-pink-500 to-rose-500', bg: 'bg-pink-100 dark:bg-pink-500/10' },
];

const weakTopics = ['Integration', 'Organic Chemistry', 'Electromagnetic Waves', 'Genetics'];

const weeklyActivity = [
  { day: 'Mon', count: 12, label: 'M' },
  { day: 'Tue', count: 8, label: 'T' },
  { day: 'Wed', count: 15, label: 'W' },
  { day: 'Thu', count: 3, label: 'T' },
  { day: 'Fri', count: 20, label: 'F' },
  { day: 'Sat', count: 18, label: 'S' },
  { day: 'Sun', count: 7, label: 'S' },
];

/* -------------------------------------------------- */
/* Subject badge color mapping                        */
/* -------------------------------------------------- */
const subjectColors = {
  Mathematics: { bg: 'bg-teal-100 dark:bg-teal-500/10', text: 'text-teal-700 dark:text-teal-300' },
  Physics: { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300' },
  Chemistry: { bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300' },
  Biology: { bg: 'bg-pink-100 dark:bg-pink-500/10', text: 'text-pink-700 dark:text-pink-300' },
};

/* -------------------------------------------------- */
/* Dashboard Page                                      */
/* -------------------------------------------------- */
export default function DashboardPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [solveMode, setSolveMode] = useState('photo'); // 'photo' | 'text'

  // Auth guard — redirect to login if no token
  useEffect(() => {
    const token = typeof window !== 'undefined' && localStorage.getItem('dm-token');
    if (!token) {
      // Allow viewing in dev/demo mode, but in production redirect
      // window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const maxActivity = Math.max(...weeklyActivity.map(d => d.count));

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
              <span className={`text-sm font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>{mockUser.streak}</span>
            </div>

            {/* Daily solve count */}
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
              darkMode ? 'bg-teal-500/10' : 'bg-teal-50'
            }`}>
              <Zap size={16} className="text-teal-500" />
              <span className={`text-sm font-bold ${darkMode ? 'text-teal-300' : 'text-teal-600'}`}>{mockUser.todaySolved} today</span>
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
              {mockUser.name.charAt(0)}
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

        {/* Welcome + Quick Solve */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Namaste, {mockUser.name.split(' ')[0]}! <span className="inline-block animate-float text-2xl">&#128075;</span>
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Ready to solve some doubts? You&apos;ve been on a {mockUser.streak}-day streak!
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
              <div className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                darkMode ? 'border-slate-600 hover:border-teal-500/50' : 'border-gray-300 hover:border-teal-400'
              }`}>
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                  <Camera size={28} className="text-white" />
                </div>
                <p className={`font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Tap to snap or upload a photo
                </p>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Supports handwritten & printed questions in 11 languages
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  placeholder="Type or paste your question here... (Hindi, English, or any supported language)"
                  rows={4}
                  className={`w-full rounded-xl p-4 text-sm outline-none resize-none transition-colors ${
                    darkMode
                      ? 'bg-slate-800 border border-slate-700 text-gray-200 placeholder-gray-500 focus:border-teal-500'
                      : 'bg-white border border-gray-200 text-gray-700 placeholder-gray-400 focus:border-teal-400'
                  }`}
                />
                <button className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2">
                  <Sparkles size={18} /> Solve with AI
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ========== STATS GRID ========== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Target, label: 'Questions Solved', value: mockUser.totalSolved, color: 'text-teal-500', bg: darkMode ? 'bg-teal-500/10' : 'bg-teal-50' },
            { icon: Flame, label: 'Current Streak', value: `${mockUser.streak} days`, color: 'text-orange-500', bg: darkMode ? 'bg-orange-500/10' : 'bg-orange-50' },
            { icon: TrendingUp, label: 'Accuracy', value: `${mockUser.accuracy}%`, color: 'text-emerald-500', bg: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50' },
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

            <div className="space-y-3">
              {mockRecentQuestions.map((q) => {
                const sc = subjectColors[q.subject] || subjectColors.Mathematics;
                return (
                  <div
                    key={q.id}
                    className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                      darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${
                      q.status === 'correct' ? 'text-emerald-500' : q.status === 'incorrect' ? 'text-red-500' : 'text-amber-500'
                    }`}>
                      {q.status === 'correct' ? <CheckCircle size={18} /> : q.status === 'incorrect' ? <XCircle size={18} /> : <Clock size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {q.question}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                          {q.subject}
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{q.chapter}</span>
                      </div>
                    </div>
                    <span className={`text-xs shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{q.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========== WEEKLY ACTIVITY ========== */}
          <div className={`rounded-2xl p-6 animate-fade-in-up delay-400 ${
            darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
          }`}>
            <h3 className={`font-bold text-lg mb-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Weekly Activity</h3>

            <div className="flex items-end justify-between gap-2 h-40 mb-4">
              {weeklyActivity.map((day) => {
                const height = maxActivity > 0 ? (day.count / maxActivity) * 100 : 0;
                return (
                  <div key={day.day} className="flex flex-col items-center gap-2 flex-1">
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

          <div className="grid sm:grid-cols-2 gap-5">
            {subjectProgress.map((subject) => {
              const Icon = subject.icon;
              return (
                <div key={subject.name} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${subject.bg}`}>
                    <Icon size={20} className={`bg-gradient-to-br ${subject.color} text-transparent bg-clip-text`} style={{ color: subject.color.includes('teal') ? '#0D9488' : subject.color.includes('blue') ? '#3B82F6' : subject.color.includes('emerald') ? '#10B981' : '#EC4899' }} />
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
        </div>

        {/* ========== UPGRADE BANNER (for free users) ========== */}
        {mockUser.plan === 'free' && (
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
