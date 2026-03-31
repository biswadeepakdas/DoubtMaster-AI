'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Phone, Mail, ArrowRight, Sun, Moon, Eye, EyeOff,
  GraduationCap, Shield, Zap, BookOpen, ChevronDown
} from 'lucide-react';
import GoogleSignInButton from '../../components/GoogleSignInButton';

const CLASSES = [6, 7, 8, 9, 10, 11, 12];
const BOARDS = ['CBSE', 'ICSE', 'State Board', 'JEE', 'NEET'];

// Map frontend-friendly board names to backend enum values
const BOARD_MAP = {
  'CBSE': 'CBSE',
  'ICSE': 'ICSE',
  'State Board': 'STATE_OTHER',
  'JEE': 'CBSE',
  'NEET': 'CBSE',
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedPlanRaw = searchParams.get('plan');
  const selectedPlan = selectedPlanRaw === 'pro' ? 'pro' : 'free';

  const [dark, setDark] = useState(false);
  const [method, setMethod] = useState('phone'); // 'phone' | 'email'
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedBoard, setSelectedBoard] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: contact, 2: details

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dm-dark');
      if (saved === 'true') { setDark(true); document.documentElement.classList.add('dark'); }
      const token = localStorage.getItem('dm-token');
      if (token) { router.push('/dashboard'); return; }
    }
  }, []);

  const toggleDark = () => {
    setDark(!dark);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('dm-dark', !dark);
  };

  const planLabel = selectedPlan === 'pro' ? 'Pro (Topper)' : 'Free (Muft)';
  const planColor = selectedPlan === 'pro' ? 'text-teal-500' : 'text-green-500';

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (method === 'phone' && !/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    if (method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (step === 1) {
      if (method === 'email' && password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      setStep(2);
      return;
    }

    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!selectedClass) { setError('Please select your class'); return; }
    if (!selectedBoard) { setError('Please select your board'); return; }
    if (method === 'email' && password.length < 8) { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    try {
      const identifier = method === 'phone' ? `+91${phone}` : email;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          identifier,
          name: name.trim(),
          class: parseInt(selectedClass, 10),
          board: BOARD_MAP[selectedBoard] || selectedBoard,
          plan: selectedPlan,
          ...(method === 'email' && { password }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');

      if (data.requiresVerification) {
        // Phone signup: OTP was sent, redirect to verify page
        sessionStorage.setItem('dm-otp-identifier', identifier);
        sessionStorage.setItem('dm-otp-method', method);
        sessionStorage.setItem('dm-otp-name', name.trim());
        router.push('/verify-otp?action=signup');
      } else {
        // Email signup: tokens returned directly, go to dashboard
        const token = data.token || data.accessToken;
        if (token) localStorage.setItem('dm-token', token);
        if (data.refreshToken) localStorage.setItem('dm-refresh-token', data.refreshToken);
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/30 via-white to-emerald-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col">
      {/* Floating orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-300/20 dark:bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-300/20 dark:bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo-icon.jpg" alt="DoubtMaster AI" className="w-9 h-9 rounded-xl object-cover" />
          <span className="text-xl font-bold text-slate-900 dark:text-white">DoubtMaster <span className="text-teal-600 dark:text-teal-400">AI</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={toggleDark} aria-label="Toggle dark mode" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {dark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-600" />}
          </button>
          <Link href="/login" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
            Already have an account? <span className="text-teal-600 dark:text-teal-400 font-semibold">Login</span>
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Plan badge */}
          {selectedPlan !== 'free' && (
            <div className="text-center mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${selectedPlan === 'pro' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                <Zap size={12} /> Signing up for {planLabel}
              </span>
            </div>
          )}

          {/* Card */}
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 rounded-3xl shadow-xl shadow-teal-500/5 dark:shadow-black/20 border border-white/50 dark:border-gray-700/50 p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
                <GraduationCap size={28} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {step === 1 ? 'Start Solving Doubts' : 'Almost There!'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                {step === 1 ? 'Free forever for NCERT. No credit card needed.' : 'Tell us about yourself'}
              </p>
              {/* Step progress indicator */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="flex items-center gap-1.5">
                  <div className={`w-8 h-1.5 rounded-full transition-colors duration-300 ${step >= 1 ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  <div className={`w-8 h-1.5 rounded-full transition-colors duration-300 ${step >= 2 ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">Step {step} of 2</span>
              </div>
            </div>

            {/* Method toggle */}
            {step === 1 && (
              <div className="flex bg-slate-100 dark:bg-gray-700/50 rounded-xl p-1 mb-6">
                <button
                  onClick={() => setMethod('phone')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${method === 'phone' ? 'bg-white dark:bg-gray-600 shadow-sm text-teal-600 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  <Phone size={16} /> Phone
                </button>
                <button
                  onClick={() => setMethod('email')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${method === 'email' ? 'bg-white dark:bg-gray-600 shadow-sm text-teal-600 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  <Mail size={16} /> Email
                </button>
              </div>
            )}

            <form onSubmit={handleSendOTP} className="space-y-4">
              {step === 1 ? (
                <>
                  {method === 'phone' ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Mobile Number</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-500 dark:text-slate-400 text-sm">
                          +91
                        </span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="9876543210"
                          className="flex-1 px-4 py-3 rounded-r-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                          autoFocus
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="arjun@example.com"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min 8 characters"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all pr-12"
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Step 2: Details */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 text-sm mb-2">
                    {method === 'phone' ? <Phone size={14} /> : <Mail size={14} />}
                    <span>{method === 'phone' ? `+91 ${phone}` : email}</span>
                    <button type="button" onClick={() => setStep(1)} className="ml-auto text-xs underline hover:no-underline">Change</button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Your Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Arjun Sharma"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Class</label>
                      <div className="relative">
                        <select
                          value={selectedClass}
                          onChange={(e) => setSelectedClass(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none appearance-none transition-all"
                        >
                          <option value="">Select</option>
                          {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Board</label>
                      <div className="relative">
                        <select
                          value={selectedBoard}
                          onChange={(e) => setSelectedBoard(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none appearance-none transition-all"
                        >
                          <option value="">Select</option>
                          {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <p className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="dm-cta-primary w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {step === 1 ? 'Continue' : 'Send OTP & Verify'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            {step === 1 && (
              <>
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-gray-700" />
                  <span className="text-xs text-slate-400">or continue with</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-gray-700" />
                </div>

                <GoogleSignInButton />
              </>
            )}
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 mt-6 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1"><Shield size={14} /> 256-bit encrypted</span>
            <span>•</span>
            <span className="flex items-center gap-1"><BookOpen size={14} /> Free forever for NCERT</span>
          </div>

          {/* Terms */}
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
            By signing up, you agree to our{' '}
            <a href="/terms-of-service" className="text-teal-500 hover:underline">Terms</a> and{' '}
            <a href="/privacy-policy" className="text-teal-500 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
