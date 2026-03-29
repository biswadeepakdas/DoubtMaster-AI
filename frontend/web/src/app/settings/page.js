'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sun, Moon, ArrowLeft, User, Mail, Phone, BookOpen,
  GraduationCap, Globe, Crown, LogOut, Save, Check,
  AlertTriangle, RefreshCw, ChevronDown, Home, Camera,
  History, BarChart3, FileText, ChevronRight
} from 'lucide-react';
import api from '../../lib/api';

/* -------------------------------------------------- */
/* Option lists                                        */
/* -------------------------------------------------- */
const CLASS_OPTIONS = ['6', '7', '8', '9', '10', '11', '12', 'Dropper'];
const BOARD_OPTIONS = ['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'Other'];
const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Marathi', 'Gujarati', 'Malayalam', 'Odia', 'Punjabi'];
const QUICK_LINKS = [
  { label: 'Home', href: '/', desc: 'Public landing page', icon: Home },
  { label: 'Dashboard', href: '/dashboard', desc: 'Daily solve hub', icon: GraduationCap },
  { label: 'Questions', href: '/questions', desc: 'All solved questions', icon: BookOpen },
  { label: 'History', href: '/history', desc: 'Recent attempts', icon: History },
  { label: 'Mock Tests', href: '/mock-tests', desc: 'Practice exams', icon: FileText },
  { label: 'Progress', href: '/progress', desc: 'Learning analytics', icon: BarChart3 },
  { label: 'Teacher', href: '/teacher', desc: 'Classroom dashboard', icon: GraduationCap },
  { label: 'Pricing', href: '/pricing', desc: 'Plans and upgrades', icon: Crown },
  { label: 'Profile', href: '/profile', desc: 'Profile overview', icon: User },
  { label: 'Solve (Dashboard Camera)', href: '/dashboard', desc: 'Photo and text solve', icon: Camera },
];

/* -------------------------------------------------- */
/* Settings Page                                       */
/* -------------------------------------------------- */
export default function SettingsPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const darkModeInitialized = useRef(false);

  // User data
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Editable form state
  const [form, setForm] = useState({ name: '', class: '', board: '', language: '' });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/api/v1/auth/me');
      const u = data.user || data;
      setUser(u);
      setForm({
        name: u.name || '',
        class: u.class || '',
        board: u.board || '',
        language: u.language || 'English',
      });
    } catch (err) {
      if (err?.status !== 401) {
        setError(err?.message || 'Failed to load profile');
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
      const savedDark = localStorage.getItem('dm-dark');
      if (savedDark === 'true') setDarkMode(true);
      fetchProfile();
    }
  }, [router, fetchProfile]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Skip localStorage write on first render so we don't overwrite
    // the saved preference before the auth-guard effect has read it.
    if (!darkModeInitialized.current) {
      darkModeInitialized.current = true;
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('dm-dark', String(darkMode));
    }
  }, [darkMode]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const data = await api.put('/api/v1/user/profile', {
        name: form.name.trim(),
        class_: form.class,
        board: form.board,
        language: form.language,
      });
      const updated = data.user || data;
      setUser((prev) => ({ ...prev, ...updated }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dm-token');
      localStorage.removeItem('dm-refresh-token');
      router.replace('/login');
    }
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
    setSaveError('');
  };

  /* Derived */
  const userPlan = user?.plan || 'free';
  const userEmail = user?.email || '';
  const userPhone = user?.phone || '';
  const hasChanges =
    form.name !== (user?.name || '') ||
    form.class !== (user?.class || '') ||
    form.board !== (user?.board || '') ||
    form.language !== (user?.language || 'English');

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading settings...</p>
      </div>
    );
  }

  /* ---- Fatal error state ---- */
  if (error && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle size={40} className="text-red-500" />
        <p className="text-lg font-semibold text-gray-800">{error}</p>
        <button
          onClick={fetchProfile}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  /* Reusable select component */
  const SelectField = ({ label, icon: Icon, value, options, onChange }) => (
    <div>
      <label className={`text-sm font-medium mb-1.5 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <span className="flex items-center gap-2"><Icon size={14} /> {label}</span>
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none rounded-xl px-4 py-3 text-sm outline-none transition-colors cursor-pointer ${
            darkMode
              ? 'bg-slate-800 border border-slate-700 text-gray-200 focus:border-teal-500'
              : 'bg-white border border-gray-200 text-gray-700 focus:border-teal-400'
          }`}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-[#0F172A]' : 'bg-gray-50'}`}>

      {/* ========== HEADER ========== */}
      <header className={`fixed top-0 w-full z-50 backdrop-blur-xl h-16 ${
        darkMode ? 'bg-slate-900/80 border-b border-slate-800' : 'bg-white/80 border-b border-gray-200'
      }`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo-icon.jpg" alt="DoubtMaster AI" className="w-8 h-8 rounded-lg object-cover" />
              <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Settings
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${darkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={handleLogout}
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                darkMode
                  ? 'text-red-300 hover:bg-red-500/10 border border-red-500/20'
                  : 'text-red-600 hover:bg-red-50 border border-red-200'
              }`}
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ========== MAIN CONTENT ========== */}
      <main className="pt-20 pb-12 px-4 sm:px-6 max-w-3xl mx-auto">

        {/* Non-fatal error banner */}
        {error && user && (
          <div className={`mb-4 p-3 rounded-xl flex items-center gap-3 text-sm ${
            darkMode ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={fetchProfile} className="shrink-0 underline font-medium">Retry</button>
          </div>
        )}

        {/* ========== PROFILE AVATAR ========== */}
        <div className="flex flex-col items-center mb-8">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold mb-3 ${
            darkMode ? 'bg-teal-500/20 text-teal-300' : 'bg-teal-100 text-teal-600'
          }`}>
            {(user?.name || 'S').charAt(0).toUpperCase()}
          </div>
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user?.name || 'Student'}</h2>
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {userEmail || userPhone || 'No contact info'}
          </span>
        </div>

        {/* ========== PROFILE FORM ========== */}
        <div className={`rounded-2xl p-6 mb-6 ${
          darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
        }`}>
          <h3 className={`font-bold text-lg mb-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Profile</h3>

          <div className="space-y-4">
            {/* Name (editable) */}
            <div>
              <label className={`text-sm font-medium mb-1.5 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <span className="flex items-center gap-2"><User size={14} /> Name</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className={`w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors ${
                  darkMode
                    ? 'bg-slate-800 border border-slate-700 text-gray-200 focus:border-teal-500'
                    : 'bg-white border border-gray-200 text-gray-700 focus:border-teal-400'
                }`}
                placeholder="Your name"
              />
            </div>

            {/* Email (read-only) */}
            {userEmail && (
              <div>
                <label className={`text-sm font-medium mb-1.5 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="flex items-center gap-2"><Mail size={14} /> Email</span>
                </label>
                <input
                  type="text"
                  value={userEmail}
                  readOnly
                  className={`w-full rounded-xl px-4 py-3 text-sm outline-none cursor-not-allowed ${
                    darkMode
                      ? 'bg-slate-900 border border-slate-700 text-gray-500'
                      : 'bg-gray-50 border border-gray-200 text-gray-600'
                  }`}
                />
              </div>
            )}

            {/* Phone (read-only) */}
            {userPhone && (
              <div>
                <label className={`text-sm font-medium mb-1.5 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="flex items-center gap-2"><Phone size={14} /> Phone</span>
                </label>
                <input
                  type="text"
                  value={userPhone}
                  readOnly
                  className={`w-full rounded-xl px-4 py-3 text-sm outline-none cursor-not-allowed ${
                    darkMode
                      ? 'bg-slate-900 border border-slate-700 text-gray-500'
                      : 'bg-gray-50 border border-gray-200 text-gray-600'
                  }`}
                />
              </div>
            )}

            {/* Class */}
            <SelectField
              label="Class"
              icon={GraduationCap}
              value={form.class}
              options={CLASS_OPTIONS}
              onChange={(v) => updateForm('class', v)}
            />

            {/* Board */}
            <SelectField
              label="Board"
              icon={BookOpen}
              value={form.board}
              options={BOARD_OPTIONS}
              onChange={(v) => updateForm('board', v)}
            />

            {/* Language */}
            <SelectField
              label="Preferred Language"
              icon={Globe}
              value={form.language}
              options={LANGUAGE_OPTIONS}
              onChange={(v) => updateForm('language', v)}
            />
          </div>

          {/* Save error */}
          {saveError && (
            <div className={`mt-4 p-3 rounded-xl text-sm ${
              darkMode ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {saveError}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`mt-5 w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              saveSuccess
                ? 'bg-emerald-500 text-white'
                : hasChanges
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-teal-500/25'
                  : (darkMode ? 'bg-slate-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed')
            }`}
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : saveSuccess ? (
              <><Check size={16} /> Saved!</>
            ) : (
              <><Save size={16} /> Save Changes</>
            )}
          </button>
        </div>

        {/* ========== PLAN INFO ========== */}
        <div className={`rounded-2xl p-6 mb-6 ${
          darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
        }`}>
          <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Plan</h3>

          <div className={`flex items-center gap-4 p-4 rounded-xl ${
            userPlan === 'free'
              ? (darkMode ? 'bg-slate-700/50' : 'bg-gray-50')
              : 'bg-gradient-to-r from-teal-500/10 to-emerald-500/10'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              userPlan === 'free'
                ? (darkMode ? 'bg-slate-600' : 'bg-gray-200')
                : (darkMode ? 'bg-amber-500/20' : 'bg-amber-50')
            }`}>
              <Crown size={22} className={userPlan === 'free' ? (darkMode ? 'text-gray-400' : 'text-gray-500') : 'text-amber-500'} />
            </div>
            <div className="flex-1">
              <p className={`font-bold capitalize ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {userPlan === 'free' ? 'Free Plan' : `${userPlan} Plan`}
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {userPlan === 'free' ? 'Limited daily solves' : 'Unlimited solves & premium features'}
              </p>
            </div>
            {userPlan === 'free' && (
              <a
                href="/pricing"
                className="shrink-0 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all"
              >
                Upgrade
              </a>
            )}
          </div>
        </div>

        {/* ========== APPEARANCE ========== */}
        <div className={`rounded-2xl p-6 mb-6 ${
          darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
        }`}>
          <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Appearance</h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon size={18} className="text-gray-300" /> : <Sun size={18} className="text-gray-600" />}
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Dark Mode
              </span>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                darkMode ? 'bg-teal-500' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                darkMode ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        {/* ========== QUICK NAVIGATION ========== */}
        <div className={`rounded-2xl p-6 mb-6 ${
          darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
        }`}>
          <h3 className={`font-bold text-lg mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Quick Navigation</h3>
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            All important pages available in the app.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {QUICK_LINKS.map(({ label, href, desc, icon: Icon }) => (
              <button
                key={label}
                onClick={() => router.push(href)}
                className={`text-left rounded-xl p-3 border transition-all flex items-start gap-3 ${
                  darkMode
                    ? 'border-slate-700 hover:border-teal-500/40 hover:bg-slate-800'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  darkMode ? 'bg-teal-500/10 text-teal-300' : 'bg-blue-100 text-blue-700'
                }`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                  <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{desc}</p>
                </div>
                <ChevronRight size={15} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
              </button>
            ))}
          </div>
        </div>

        {/* ========== LOGOUT ========== */}
        <div className={`rounded-2xl p-6 mb-8 ${
          darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
        }`}>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-colors ${
              darkMode
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
            }`}
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>

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
