'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Camera, BookOpen, Brain, Globe, Smartphone, Target,
  BarChart3, School, IndianRupee, Sun, Moon, Menu,
  ChevronRight, Check, X, Zap, Shield,
  MessageCircle, Users, ArrowRight, Play,
  Sparkles, GraduationCap, Languages, Wifi, WifiOff,
  Heart, Twitter, Instagram, Youtube, Linkedin,
  Mail, Phone, MapPin
} from 'lucide-react';

/* -------------------------------------------------- */
/* Animated counter hook                               */
/* -------------------------------------------------- */
function useCounter(target, duration = 2000, startOnView = true) {
  // Default to the target value so the number is never shown as 0 on fast loads.
  const [count, setCount] = useState(target);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (!startOnView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          // Reset to 0 then animate up to target when the element enters view.
          setCount(0);
          const startTime = performance.now();
          const step = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration, startOnView]);

  return [count, ref];
}

/* -------------------------------------------------- */
/* Intersection observer hook for entrance animations  */
/* -------------------------------------------------- */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* -------------------------------------------------- */
/* Main Landing Page                                   */
/* -------------------------------------------------- */
// Keep full landing page visible for clearer product communication.
const ANIMATION_WEDGE_MODE = false;

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Counters
  const [languages, languagesRef] = useCounter(11, 1500);

  // Section observers
  const [featuresRef, featuresInView] = useInView();
  const [howRef, howInView] = useInView();
  const [pricingRef, pricingInView] = useInView();
  const [ctaRef, ctaInView] = useInView();

  // Dark mode: persist to localStorage and sync with document
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dm-dark');
      if (saved === 'true') {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
      }
      const token = localStorage.getItem('dm-token');
      if (token) setIsLoggedIn(true);
    }
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

  const navLinks = ANIMATION_WEDGE_MODE
    ? [{ href: isLoggedIn ? '/dashboard' : '/login', label: isLoggedIn ? 'Dashboard' : 'Login' }]
    : [
        { href: '#features', label: 'Features' },
        { href: '#how-it-works', label: 'How It Works' },
        { href: '#pricing', label: 'Pricing' },
        { href: isLoggedIn ? '/dashboard' : '/login', label: isLoggedIn ? 'Dashboard' : 'Login' },
      ];

  const features = [
    { icon: Camera, title: 'Photo Solve', desc: 'Snap any question -- printed or handwritten. Our AI reads Hindi, Tamil, Telugu and more.', color: 'from-teal-500 to-emerald-500' },
    { icon: Brain, title: 'Learn Mode', desc: "Don't just copy answers. Explain what you understood, then see the solution. Actually learn!", color: 'from-amber-500 to-orange-500' },
    { icon: BookOpen, title: 'NCERT Exact Match', desc: 'Solutions mapped exactly to NCERT textbooks. Chapter, exercise, question number -- all matched.', color: 'from-emerald-500 to-teal-500' },
    { icon: Languages, title: '11 Languages', desc: 'Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati, Malayalam, Punjabi, Odia + English.', color: 'from-blue-500 to-cyan-500' },
    { icon: Smartphone, title: 'Works on Any Phone', desc: 'Under 5 MB app. Works on 2GB RAM phones. Offline mode for exam week. Low-data friendly.', color: 'from-pink-500 to-rose-500' },
    { icon: Target, title: 'JEE/NEET Deep Solve', desc: 'NCERT + PYQ coverage. Concept tagging, alternative methods, and AI-powered accuracy.', color: 'from-teal-500 to-teal-500' },
    { icon: BarChart3, title: 'Smart Progress', desc: 'AI detects your weak topics. Daily streak, subject mastery, personalized practice.', color: 'from-cyan-500 to-blue-500' },
    { icon: School, title: 'Teacher Dashboard', desc: 'Schools get free analytics. See which students need help. Anti-cheating watermarks.', color: 'from-green-500 to-emerald-500' },
    { icon: IndianRupee, title: 'India-Priced', desc: "Free NCERT forever. Pro at just Rs.199/month. Built for real student outcomes.", color: 'from-amber-500 to-yellow-500' },
  ];

  const steps = [
    { num: 1, icon: Camera, title: 'Snap a Photo', desc: 'Take a picture of any question from your textbook, notebook, or screen.' },
    { num: 2, icon: Sparkles, title: 'AI Solves Step-by-Step', desc: 'Our AI breaks down the solution with clear steps, formulas, and explanations.' },
    { num: 3, icon: GraduationCap, title: 'Learn the Concept', desc: 'Understand the "why" behind each step. Build real knowledge, not just answers.' },
  ];

  const boards = ['CBSE', 'ICSE', 'JEE', 'NEET', 'State Boards'];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-[#0F172A]' : 'bg-white'}`}>

      {/* ========== NAVBAR ========== */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5">
            <img src="/logo-icon.jpg" alt="DoubtMaster AI" className="w-9 h-9 rounded-xl object-cover" />
            <span className={`font-bold text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              DoubtMaster <span className="text-teal-500">AI</span>
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'
              }`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <a
              href="/signup"
              className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-300 hover:-translate-y-0.5"
            >
              Start Free
            </a>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${darkMode ? 'text-yellow-400' : 'text-gray-500'}`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden animate-slide-down border-t ${
            darkMode ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-gray-100'
          } backdrop-blur-lg`}>
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/signup"
                className="block w-full text-center bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-5 py-3 rounded-xl text-sm font-semibold"
              >
                Start Free
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden bg-gradient-hero">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left text */}
            <div className="text-center lg:text-left">
              <div className="flex justify-center lg:justify-start mb-6 animate-fade-in-up">
                <img src="/logo-dark.jpg" alt="DoubtMaster AI" className="h-24 w-auto rounded-2xl shadow-xl shadow-blue-500/20" />
              </div>

              <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-900 dark:text-blue-200 px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-fade-in-up shadow-sm">
                <GraduationCap size={16} />
                <span>Designed for CBSE, ICSE &amp; State Boards</span>
              </div>

              <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 animate-fade-in-up delay-100 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {ANIMATION_WEDGE_MODE ? (
                  <>See the Physics.{' '}<br className="hidden sm:block" /><span className="gradient-text-hero">Don&#39;t Just Read It.</span></>
                ) : (
                  <>Clear Doubts.{' '}<br className="hidden sm:block" /><span className="gradient-text-hero">Think Better.</span></>
                )}
              </h1>

              <p className={`text-lg sm:text-xl max-w-xl mx-auto lg:mx-0 mb-8 animate-fade-in-up delay-200 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {ANIMATION_WEDGE_MODE
                  ? 'Snap a physics or math problem. Get an interactive animation that lets you SEE the concept — projectile motion, optics, graphs — not just read the answer.'
                  : 'India\'s smartest AI homework solver. Snap a photo, get step-by-step solutions for NCERT, JEE, NEET -- in Hindi and 10 regional languages. Free forever for NCERT.'
                }
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6 animate-fade-in-up delay-300">
                <a
                  href="/signup"
                  className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-sky-600 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:shadow-xl hover:shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-1"
                >
                  {ANIMATION_WEDGE_MODE ? 'Try It Free' : 'Start Solving Free'}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </a>
                {!ANIMATION_WEDGE_MODE && (
                <a
                  href="#how-it-works"
                  className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold transition-all duration-300 hover:-translate-y-1 border ${
                    darkMode
                      ? 'bg-slate-800 text-gray-200 border-slate-700 hover:bg-slate-700'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Play size={20} />
                  See How It Works
                </a>
                )}
              </div>

              <p className={`text-sm animate-fade-in-up delay-400 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                No credit card required. Unlimited NCERT solutions free forever.
              </p>
            </div>

            {/* Right: Phone mockup */}
            <div className="hidden lg:flex justify-center animate-fade-in-up delay-300">
              <div className="relative">
                {/* Phone frame */}
                <div className={`w-[280px] h-[560px] rounded-[3rem] border-4 p-3 shadow-2xl animate-float ${
                  darkMode ? 'border-slate-600 bg-slate-800 shadow-indigo-500/10' : 'border-gray-200 bg-white shadow-indigo-500/10'
                }`}>
                  {/* Status bar */}
                  <div className={`flex items-center justify-between px-4 py-2 text-xs ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <span>9:41</span>
                    <div className="flex gap-1">
                      <Wifi size={12} />
                      <div className="w-6 h-3 rounded-sm border border-current relative">
                      <div className="absolute inset-0.5 right-1 bg-blue-500 rounded-sm" />
                      </div>
                    </div>
                  </div>
                  {/* App content mockup */}
                  <div className={`rounded-2xl p-4 h-full ${darkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 bg-gradient-to-br from-indigo-600 to-sky-600 rounded-lg" />
                      <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>DoubtMaster AI</span>
                    </div>
                    {/* Mock question card */}
                    <div className={`rounded-xl p-3 mb-3 ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
                      <div className={`text-xs font-medium mb-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Mathematics - Ch 3</div>
                      <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Find the value of x in: 2x + 5 = 15</div>
                    </div>
                    {/* Mock step */}
                    <div className={`rounded-xl p-3 mb-3 border-l-4 border-indigo-500 ${darkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                      <div className={`text-xs font-bold mb-1 ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>Step 1</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>2x + 5 = 15</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>2x = 15 - 5 = 10</div>
                    </div>
                    <div className={`rounded-xl p-3 mb-3 border-l-4 border-sky-500 ${darkMode ? 'bg-sky-500/10' : 'bg-sky-50'}`}>
                      <div className={`text-xs font-bold mb-1 ${darkMode ? 'text-sky-300' : 'text-sky-700'}`}>Step 2</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>x = 10 / 2</div>
                      <div className={`text-xs font-bold ${darkMode ? 'text-sky-300' : 'text-sky-700'}`}>x = 5</div>
                    </div>
                    {/* Mock camera button */}
                    <div className="flex justify-center mt-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-sky-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Camera size={24} className="text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating badges around phone */}
                <div className={`absolute -top-4 -right-12 px-3 py-2 rounded-xl text-xs font-bold shadow-lg ${
                  darkMode ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}>
                  <div className="flex items-center gap-1"><Check size={12} /> AI-Powered</div>
                </div>
                <div className={`absolute -bottom-2 -left-16 px-3 py-2 rounded-xl text-xs font-bold shadow-lg ${
                  darkMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <div className="flex items-center gap-1"><Zap size={12} /> Under 3 sec</div>
                </div>
                <div className={`absolute top-1/2 -right-20 px-3 py-2 rounded-xl text-xs font-bold shadow-lg ${
                  darkMode ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-sky-50 text-sky-700 border border-sky-200'
                }`}>
                  <div className="flex items-center gap-1"><Globe size={12} /> 11 Languages</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SOCIAL PROOF / TRUST BAR ========== */}
      <section className={`py-8 border-y ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50/80 border-gray-100'}`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {/* Built for Indian students */}
            <div className="flex items-center gap-2">
              <Users size={18} className="text-teal-500" />
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Built for Indian Students</span>
            </div>
            {/* Boards */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {boards.map((board) => (
                <span
                  key={board}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    darkMode ? 'bg-slate-800 text-gray-300 border border-slate-700' : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {board}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTIONS HIDDEN IN ANIMATION WEDGE MODE ========== */}
      {!ANIMATION_WEDGE_MODE && <>
      {/* ========== ANIMATED STATS ========== */}
      <section className="bg-gradient-cta py-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-8 px-4 text-center relative z-10">
          <div>
            <div className="text-3xl md:text-4xl font-extrabold text-white">Growing Community</div>
            <div className="text-teal-200 text-sm mt-1">of Indian Students</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-extrabold text-white">AI-Powered</div>
            <div className="text-teal-200 text-sm mt-1">Accuracy</div>
          </div>
          <div ref={languagesRef}>
            <div className="text-3xl md:text-4xl font-extrabold text-white">{languages}</div>
            <div className="text-teal-200 text-sm mt-1">Languages Supported</div>
          </div>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section id="features" className={`py-20 px-4 ${darkMode ? '' : ''}`} ref={featuresRef}>
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-16 ${featuresInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Why Students Love <span className="gradient-text">DoubtMaster</span>
            </h2>
            <p className={`max-w-2xl mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Built exclusively for Indian students. Every feature designed for CBSE, ICSE, JEE, and NEET.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`group p-6 rounded-2xl hover-card glass-card cursor-default ${
                    featuresInView ? 'animate-fade-in-up' : 'opacity-0'
                  }`}
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 ${
                    darkMode ? 'bg-slate-700 text-teal-300' : 'bg-teal-50 text-teal-700'
                  }`}>
                    <Icon size={22} />
                  </div>
                  <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {feature.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className={`py-20 px-4 ${darkMode ? 'bg-slate-900/50' : 'bg-gray-50'}`} ref={howRef}>
        <div className="max-w-5xl mx-auto">
          <div className={`text-center mb-16 ${howInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              How It Works
            </h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Three simple steps to master any concept
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Horizontal line behind */}
            <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 opacity-30" />

            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className={`text-center relative ${howInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                  style={{ animationDelay: `${i * 0.2}s` }}
                >
                  {/* Number circle */}
                  <div className="flex justify-center mb-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center relative z-10 ${
                      darkMode
                        ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-xl shadow-teal-500/20'
                        : 'bg-blue-100 border border-blue-200 shadow-lg shadow-blue-500/10'
                    }`}>
                      <Icon size={28} className={darkMode ? 'text-white' : 'text-blue-700'} />
                    </div>
                  </div>
                  <div className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider mb-3 ${
                    darkMode ? 'text-teal-400' : 'text-teal-600'
                  }`}>
                    Step {step.num}
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {step.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section id="pricing" className="py-20 px-4" ref={pricingRef}>
        <div className="max-w-5xl mx-auto">
          <div className={`text-center mb-12 ${pricingInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Simple, Student-Friendly Pricing
            </h2>
            <p className={`mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Designed for Indian families. No hidden fees.
            </p>

            <div className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full ${
              darkMode ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              Premium plans coming soon
            </div>
          </div>

          <div className={`grid md:grid-cols-2 gap-6 ${pricingInView ? '' : ''}`}>
            {/* Free */}
            <div className={`rounded-2xl p-8 hover-card ${
              pricingInView ? 'animate-fade-in-up delay-100' : 'opacity-0'
            } ${darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Free (Muft)</h3>
              <div className="mt-4 mb-6">
                <span className={`text-4xl font-extrabold ${darkMode ? 'text-white' : 'text-gray-900'}`}>&#8377;0</span>
                <span className={`ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>forever</span>
              </div>
              <ul className="space-y-3 text-sm mb-8">
                {[
                  [true, 'Unlimited NCERT solutions (Class 6-12)'],
                  [true, '20 JEE/NEET solves per day'],
                  [true, 'Basic progress tracking'],
                  [true, 'Hindi + English'],
                  [false, 'Offline mode'],
                  [false, 'Learn Mode'],
                ].map(([included, text]) => (
                  <li key={text} className={`flex items-center gap-2 ${
                    included
                      ? (darkMode ? 'text-gray-300' : 'text-gray-600')
                      : (darkMode ? 'text-gray-600' : 'text-gray-500')
                  }`}>
                    {included
                      ? <Check size={16} className="text-emerald-500 shrink-0" />
                      : <X size={16} className="text-gray-400 shrink-0" />}
                    {text}
                  </li>
                ))}
              </ul>
              <a href="/signup" className={`block w-full text-center py-3 rounded-xl font-semibold transition-all duration-300 ${
                darkMode ? 'bg-slate-700 text-gray-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
                Get Started Free
              </a>
            </div>

            {/* Pro */}
            <div className={`rounded-2xl p-8 relative hover-card ${
              pricingInView ? 'animate-fade-in-up delay-200' : 'opacity-0'
            } ${darkMode ? 'bg-slate-800/50 border-2 border-teal-500 overflow-visible' : 'bg-white border-2 border-blue-600 overflow-visible'}`}>
              <div
                className={`absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border-2 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wide shadow-md ${
                  darkMode
                    ? 'border-slate-700 bg-indigo-500 text-white'
                    : 'border-white bg-indigo-600 text-white ring-2 ring-indigo-600/30'
                }`}
              >
                Most popular
              </div>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Pro (Topper)</h3>
              <div className="mt-4 mb-6">
                <span className={`text-4xl font-extrabold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  &#8377;199
                </span>
                <span className={`ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>/month</span>
              </div>
              <ul className="space-y-3 text-sm mb-8">
                {[
                  'Everything in Free',
                  'Unlimited JEE/NEET solves',
                  'Learn Mode',
                  'Offline subject packs',
                  'Mock tests with analysis',
                  'All 11 languages',
                  'No ads, priority AI',
                ].map((text) => (
                  <li key={text} className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Check size={16} className="text-emerald-500 shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
              <a href="/signup?plan=pro" className="block w-full text-center bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-300">
                Choose Pro
              </a>
            </div>
          </div>

          <div className={`mt-6 rounded-2xl p-6 ${
            darkMode ? 'bg-slate-800/40 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Premium (Coming Soon)</h3>
              <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${
                darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'
              }`}>
                MULTIPLE OPTIONS
              </span>
            </div>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm`}>
              Advanced options like live doubt chat, personalized study plans, and parent reporting are being prepared.
            </p>
          </div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="py-20 px-4 bg-gradient-cta relative overflow-hidden" ref={ctaRef}>

        <div className={`max-w-3xl mx-auto text-center relative z-10 ${ctaInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Start Solving in 30 Seconds
          </h2>
          <p className="text-teal-200 mb-8 text-lg">
            Join Indian students who study smarter with DoubtMaster AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/signup" className="group inline-flex items-center justify-center gap-2 bg-white text-teal-600 px-8 py-4 rounded-2xl text-lg font-bold hover:bg-gray-50 transition-all duration-300 hover:-translate-y-1 shadow-xl shadow-black/10">
              Sign Up Free
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="/signup" className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-white/20 transition-all duration-300 hover:-translate-y-1 border border-white/20">
              <ArrowRight size={20} />
              Get Started Free
            </a>
          </div>
        </div>
      </section>

      </>}
      {/* ========== END HIDDEN SECTIONS ========== */}

      {/* ========== FOOTER ========== */}
      <footer className={`py-16 px-4 ${darkMode ? 'bg-slate-950' : 'bg-gray-900'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/logo-icon.jpg" alt="DoubtMaster AI" className="w-9 h-9 rounded-xl object-cover" />
                <span className="font-bold text-xl text-white">
                  DoubtMaster <span className="text-teal-400">AI</span>
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-6 max-w-xs">
                India's #1 AI homework solver. Built for CBSE, ICSE, JEE, NEET students. Free forever for NCERT.
              </p>
              {/* Social icons */}
              <div className="flex gap-3">
                {[
                  { Icon: Twitter, label: 'Twitter', href: 'https://twitter.com/doubtmasterai' },
                  { Icon: Instagram, label: 'Instagram', href: 'https://instagram.com/doubtmasterai' },
                  { Icon: Youtube, label: 'YouTube', href: 'https://youtube.com/@doubtmasterai' },
                  { Icon: Linkedin, label: 'LinkedIn', href: 'https://linkedin.com/company/doubtmasterai' },
                ].map(({ Icon, label, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Follow us on ${label}`}
                    className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-teal-500 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
              {/* Mobile app status */}
              <div className="mt-6">
                <span className="text-sm text-gray-400 italic">Mobile app coming soon</span>
              </div>
            </div>

            {/* Links */}
            <div>
              <div className="font-semibold text-white mb-4 text-sm">Product</div>
              <ul className="space-y-2.5 text-sm">
                {[
                  { label: 'NCERT Solutions', href: '/questions' },
                  { label: 'JEE Preparation', href: '/mock-tests' },
                  { label: 'NEET Preparation', href: '/mock-tests' },
                  { label: 'Mock Tests', href: '/mock-tests' },
                  { label: 'Learn Mode', href: '/dashboard' },
                ].map((item) => (
                  <li key={item.label}><a href={item.href} className="text-gray-400 hover:text-teal-400 transition-colors">{item.label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-white mb-4 text-sm">Company</div>
              <ul className="space-y-2.5 text-sm">
                {[
                  { label: 'About', href: '/about' },
                  { label: 'Careers', href: '/careers' },
                  { label: 'Blog', href: '/blog' },
                  { label: 'Contact', href: 'mailto:support@doubtmaster.ai' },
                  { label: 'Press', href: '/press' },
                ].map((item) => (
                  <li key={item.label}><a href={item.href} className="text-gray-400 hover:text-teal-400 transition-colors">{item.label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-white mb-4 text-sm">Legal</div>
              <ul className="space-y-2.5 text-sm">
                {[
                  { label: 'Privacy Policy', href: '/privacy-policy' },
                  { label: 'Terms of Service', href: '/terms-of-service' },
                  { label: 'Refund Policy', href: '/refund-policy' },
                  { label: 'Cookie Policy', href: '/cookie-policy' },
                ].map((item) => (
                  <li key={item.label}><a href={item.href} className="text-gray-400 hover:text-teal-400 transition-colors">{item.label}</a></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              &copy; 2026 DoubtMaster AI. Made with <Heart size={12} className="inline text-red-500 fill-red-500" /> in India for Indian students.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <a href="mailto:support@doubtmaster.ai" className="flex items-center gap-1 hover:text-gray-300 transition-colors">
                <Mail size={14} /> support@doubtmaster.ai
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
