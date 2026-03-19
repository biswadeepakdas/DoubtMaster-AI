'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Bell, Clock, BarChart3, BookOpen, Brain,
  Calculator, Atom, FlaskConical, Dna, Target, Timer,
  FileText, TrendingUp, CheckCircle, Sparkles, Sun, Moon,
  ClipboardList, Layers, Award, Zap,
} from 'lucide-react';

const features = [
  {
    icon: Layers,
    title: 'Subject-wise Tests',
    description: 'Focused tests for Math, Physics, Chemistry, and Biology',
    color: 'from-teal-500 to-emerald-500',
    bg: 'bg-teal-500/10',
    iconColor: 'text-teal-500',
  },
  {
    icon: ClipboardList,
    title: 'Board-wise Tests',
    description: 'Tailored for CBSE, ICSE, JEE, and NEET syllabi',
    color: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
  {
    icon: Timer,
    title: 'Timed with Auto-submit',
    description: 'Real exam simulation with countdown timer and auto-submission',
    color: 'from-orange-500 to-amber-500',
    bg: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
  },
  {
    icon: BarChart3,
    title: 'Detailed Analytics',
    description: 'Performance breakdown by topic, difficulty, and time spent',
    color: 'from-purple-500 to-pink-500',
    bg: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
  },
];

const subjects = [
  { name: 'Mathematics', icon: Calculator, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  { name: 'Physics', icon: Atom, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { name: 'Chemistry', icon: FlaskConical, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { name: 'Biology', icon: Dna, color: 'text-pink-500', bg: 'bg-pink-500/10' },
];

const boards = ['CBSE', 'ICSE', 'JEE', 'NEET'];

export default function MockTestsPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [toast, setToast] = useState('');

  // Auth guard
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('dm-token');
      if (!token) {
        router.replace('/login');
      }
    }
  }, [router]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-[#0F172A]' : 'bg-gray-50'}`}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium shadow-lg animate-fade-in-up">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className={`fixed top-0 w-full z-50 glass h-16 ${darkMode ? 'border-b border-slate-800' : 'border-b border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className={`flex items-center gap-2 text-sm font-medium ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">D</span>
              </div>
              <span className={`font-bold text-lg hidden sm:block ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                DoubtMaster
              </span>
            </a>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg ${darkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-5xl mx-auto">

        {/* Page Title */}
        <div className="mb-10 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-teal-500/10' : 'bg-teal-50'}`}>
              <FileText size={22} className="text-teal-500" />
            </div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Mock Tests
            </h1>
          </div>
        </div>

        {/* Coming Soon Hero */}
        <div className={`rounded-2xl p-8 sm:p-12 mb-10 relative overflow-hidden text-center animate-fade-in-up delay-100 ${
          darkMode
            ? 'bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/20'
            : 'bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100'
        }`}>
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            {/* Icon cluster */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-teal-500/20' : 'bg-teal-100'}`}>
                <Target size={24} className="text-teal-500" />
              </div>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20`}>
                <ClipboardList size={32} className="text-white" />
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                <TrendingUp size={24} className="text-emerald-500" />
              </div>
            </div>

            <h2 className={`text-2xl sm:text-3xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Mock Tests are coming soon!
            </h2>
            <p className={`text-sm sm:text-base max-w-lg mx-auto mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Practice with timed JEE/NEET mock tests, get detailed analysis, and track your improvement.
            </p>

            <button
              onClick={() => showToast("We'll notify you when mock tests are ready!")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-7 py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all"
            >
              <Bell size={18} />
              Notify Me
            </button>
          </div>
        </div>

        {/* What to expect — Features Grid */}
        <div className="mb-10 animate-fade-in-up delay-200">
          <h3 className={`font-bold text-lg mb-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            What to expect
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`rounded-2xl p-5 transition-colors ${
                    darkMode ? 'bg-slate-800/50 border border-slate-700 hover:border-slate-600' : 'bg-white border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${feature.bg}`}>
                    <Icon size={20} className={feature.iconColor} />
                  </div>
                  <h4 className={`font-semibold text-sm mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    {feature.title}
                  </h4>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subjects Preview */}
        <div className="mb-10 animate-fade-in-up delay-300">
          <h3 className={`font-bold text-lg mb-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Subjects covered
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {subjects.map((subject) => {
              const Icon = subject.icon;
              return (
                <div
                  key={subject.name}
                  className={`rounded-2xl p-5 text-center transition-colors ${
                    darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${subject.bg}`}>
                    <Icon size={24} className={subject.color} />
                  </div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {subject.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Boards Preview */}
        <div className="mb-10 animate-fade-in-up delay-400">
          <h3 className={`font-bold text-lg mb-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Board &amp; exam support
          </h3>
          <div className="flex flex-wrap gap-3">
            {boards.map((board) => (
              <div
                key={board}
                className={`px-5 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                  darkMode
                    ? 'bg-slate-800/50 border border-slate-700 text-gray-300'
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                {board}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className={`rounded-2xl p-6 sm:p-8 text-center animate-fade-in-up delay-500 ${
          darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
        }`}>
          <Sparkles size={28} className="text-teal-500 mx-auto mb-3" />
          <h3 className={`font-bold text-lg mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Meanwhile, keep solving doubts!
          </h3>
          <p className={`text-sm mb-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Every question you solve makes you stronger for the real exam.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all"
          >
            <Zap size={18} />
            Go to Dashboard
          </a>
        </div>
      </main>
    </div>
  );
}
