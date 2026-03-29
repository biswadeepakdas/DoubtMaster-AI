'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Sun, Moon, ShieldCheck, RefreshCw } from 'lucide-react';

const OTP_LENGTH = 6;

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const action = searchParams.get('action') || 'login';

  const [dark, setDark] = useState(false);
  const [otp, setOtp] = useState(new Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [method, setMethod] = useState('phone');
  const inputRefs = useRef([]);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dm-dark');
      if (saved === 'true') { setDark(true); document.documentElement.classList.add('dark'); }
      setIdentifier(sessionStorage.getItem('dm-otp-identifier') || '');
      setMethod(sessionStorage.getItem('dm-otp-method') || 'phone');
    }
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const toggleDark = () => {
    setDark(!dark);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('dm-dark', !dark);
  };

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    // Auto-focus next
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (newOtp.every(d => d !== '') && newOtp.join('').length === OTP_LENGTH) {
      verifyOtp(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === 0) return;
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();

    if (newOtp.every(d => d !== '')) {
      verifyOtp(newOtp.join(''));
    }
  };

  const verifyOtp = async (code) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setLoading(true);
    setError('');
    try {
      // signup uses /verify-signup (accepts {identifier, otp, method})
      // login  uses /verify-otp   (accepts {phone, otp})
      const isSignup = action === 'signup';
      const endpoint = isSignup ? '/api/v1/auth/verify-signup' : '/api/v1/auth/verify-otp';
      const payload = isSignup
        ? { identifier, otp: code, method }
        : { phone: identifier, otp: code };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid OTP');

      const token = data.token || data.accessToken;
      if (token) localStorage.setItem('dm-token', token);
      if (data.refreshToken) localStorage.setItem('dm-refresh-token', data.refreshToken);
      sessionStorage.removeItem('dm-otp-identifier');
      sessionStorage.removeItem('dm-otp-method');
      sessionStorage.removeItem('dm-otp-name');

      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
      setOtp(new Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setResendTimer(30);
    setError('');
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, method }),
      });
    } catch {}
  };

  const maskedIdentifier = identifier
    ? method === 'phone'
      ? identifier.replace(/(\+91)(\d{2})\d{4}(\d{4})/, '$1 $2****$3')
      : identifier.replace(/(.{2})(.*)(@.*)/, '$1****$3')
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/30 via-white to-emerald-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col">
      {/* Floating orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-green-300/15 dark:bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-teal-300/15 dark:bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo-icon.jpg" alt="DoubtMaster AI" className="w-9 h-9 rounded-xl object-cover" />
          <span className="text-xl font-bold text-slate-900 dark:text-white">DoubtMaster <span className="text-teal-600 dark:text-teal-400">AI</span></span>
        </Link>
        <button onClick={toggleDark} aria-label="Toggle dark mode" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          {dark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-600" />}
        </button>
      </nav>

      {/* Main */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 rounded-3xl shadow-xl shadow-teal-500/5 dark:shadow-black/20 border border-white/50 dark:border-gray-700/50 p-8">
            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-300 transition-colors mb-6"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                <ShieldCheck size={28} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Verify OTP</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                We sent a 6-digit code to<br />
                <span className="font-semibold text-slate-700 dark:text-slate-200">{maskedIdentifier}</span>
              </p>
            </div>

            {/* OTP Inputs */}
            <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  aria-label={`OTP digit ${index + 1}`}
                  autoComplete="one-time-code"
                  className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none ${
                    digit
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                      : 'border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white'
                  } focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20`}
                  disabled={loading}
                />
              ))}
            </div>

            {error && (
              <p className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg text-center mb-4">{error}</p>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400 mb-4">
                <div className="w-5 h-5 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
                <span className="text-sm font-medium">Verifying...</span>
              </div>
            )}

            {/* Resend */}
            <div className="text-center">
              {canResend ? (
                <button
                  onClick={handleResend}
                  className="flex items-center justify-center gap-1.5 mx-auto text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                >
                  <RefreshCw size={14} /> Resend OTP
                </button>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Resend OTP in <span className="font-semibold text-slate-600 dark:text-slate-300">{resendTimer}s</span>
                </p>
              )}
            </div>

            {/* Verify button (manual fallback) */}
            <button
              onClick={() => {
                const code = otp.join('');
                if (code.length === OTP_LENGTH) verifyOtp(code);
              }}
              disabled={loading || otp.some(d => d === '')}
              className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Verify & Continue
            </button>

            <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
              Tip: The OTP auto-submits when you enter all 6 digits
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
