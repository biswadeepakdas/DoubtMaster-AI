'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Phone, Mail, ArrowRight, Sun, Moon, Eye, EyeOff,
  GraduationCap, Shield
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [method, setMethod] = useState('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleLogin = async (e) => {
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

    setLoading(true);
    try {
      const identifier = method === 'phone' ? `+91${phone}` : email;

      if (method === 'phone') {
        // Phone login: send OTP
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/auth/login/otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: identifier }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to send OTP');

        sessionStorage.setItem('dm-otp-identifier', identifier);
        sessionStorage.setItem('dm-otp-method', 'phone');
        router.push('/verify-otp?action=login');
      } else {
        // Email login: password auth
        if (!password) { setError('Please enter your password'); setLoading(false); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters'); setLoading(false); return; }
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');

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
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-teal-300/20 dark:bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-emerald-300/20 dark:bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">D</div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">DoubtMaster <span className="text-teal-600 dark:text-teal-400">AI</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={toggleDark} aria-label="Toggle dark mode" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {dark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-600" />}
          </button>
          <Link href="/signup" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
            New here? <span className="text-teal-600 dark:text-teal-400 font-semibold">Sign Up Free</span>
          </Link>
        </div>
      </nav>

      {/* Main */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 rounded-3xl shadow-xl shadow-teal-500/5 dark:shadow-black/20 border border-white/50 dark:border-gray-700/50 p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
                <GraduationCap size={28} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome Back!</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Login to continue solving doubts</p>
            </div>

            {/* Method toggle */}
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

            <form onSubmit={handleLogin} className="space-y-4">
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
                        placeholder="Enter your password"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all pr-12"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <div className="text-right mt-1">
                      <span className="text-xs text-teal-500 cursor-pointer hover:underline" title="Coming soon">Forgot password?</span>
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
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {method === 'phone' ? 'Send OTP' : 'Login'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-slate-200 dark:bg-gray-700" />
              <span className="text-xs text-slate-400">or continue with</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-gray-700" />
            </div>

            <button disabled className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-200 font-medium opacity-50 cursor-not-allowed">
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google (Coming Soon)
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 mt-6 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1"><Shield size={14} /> 256-bit encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
