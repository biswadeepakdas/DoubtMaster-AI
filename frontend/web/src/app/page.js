'use client';

import { useState } from 'react';

export default function LandingPage() {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-lg border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="font-bold text-xl text-gray-900">DoubtMaster AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Pricing</a>
            <a href="#ncert" className="text-gray-600 hover:text-gray-900 text-sm font-medium">NCERT</a>
            <a href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Login</a>
            <a href="/signup" className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-600 transition">
              Start Free
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span>{'🎓'}</span> Trusted by 10 lakh+ Indian students
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight mb-6">
            Samjho, Sirf<br />
            <span className="text-indigo-500">Answer Mat Dekho</span>
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            India's smartest AI homework solver. Snap a photo, get step-by-step solutions for
            NCERT, JEE, NEET — in Hindi and 10 regional languages. Free forever for NCERT.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <a href="/signup" className="bg-indigo-500 text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-indigo-600 transition pulse-glow">
              Start Solving Free
            </a>
            <a href="#demo" className="bg-gray-100 text-gray-700 px-8 py-4 rounded-xl text-lg font-bold hover:bg-gray-200 transition">
              Watch Demo
            </a>
          </div>

          <p className="text-sm text-gray-500">
            No credit card required. Unlimited NCERT solutions free forever.
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-indigo-500 py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-4 text-center">
          {[
            { value: '99.5%', label: 'Accuracy on NCERT' },
            { value: '< 3 sec', label: 'Solve Time' },
            { value: '11', label: 'Languages Supported' },
            { value: '₹0', label: 'For NCERT Solutions' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl md:text-4xl font-extrabold text-white">{stat.value}</div>
              <div className="text-indigo-200 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
            Why Students Love DoubtMaster
          </h2>
          <p className="text-gray-600 text-center mb-16 max-w-2xl mx-auto">
            Built exclusively for Indian students. Every feature designed for CBSE, ICSE, JEE, and NEET.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '📸', title: 'Photo Solve', desc: 'Snap any question — printed or handwritten. Our AI reads Hindi, Tamil, Telugu and more.' },
              { icon: '🧠', title: 'Learn Mode', desc: 'Don\'t just copy answers. Explain what you understood, then see the solution. Actually learn!' },
              { icon: '📚', title: 'NCERT Exact Match', desc: 'Solutions mapped exactly to NCERT textbooks. Chapter, exercise, question number — all matched.' },
              { icon: '🗣️', title: '11 Languages', desc: 'Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati, Malayalam, Punjabi, Odia + English.' },
              { icon: '📱', title: 'Works on Any Phone', desc: 'Under 5 MB app. Works on 2GB RAM phones. Offline mode for exam week. Low-data friendly.' },
              { icon: '🎯', title: 'JEE/NEET Deep Solve', desc: 'Trained on 50,000+ PYQs. Concept tagging, alternative methods, and accuracy above 98%.' },
              { icon: '📊', title: 'Smart Progress', desc: 'AI detects your weak topics. Daily streak, subject mastery, personalized practice.' },
              { icon: '🏫', title: 'Teacher Dashboard', desc: 'Schools get free analytics. See which students need help. Anti-cheating watermarks.' },
              { icon: '💰', title: 'India-Priced', desc: 'Free NCERT forever. Pro at just ₹49/month. 25x cheaper than BYJU\'s. Real value.' },
            ].map((feature) => (
              <div key={feature.title} className="p-6 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg transition">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
            Simple, Student-Friendly Pricing
          </h2>
          <p className="text-gray-600 text-center mb-16">Designed for Indian families. No hidden fees.</p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Free */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Free (Muft)</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-extrabold text-gray-900">₹0</span>
                <span className="text-gray-500 ml-1">forever</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                <li>{'✅'} Unlimited NCERT solutions (Class 6-12)</li>
                <li>{'✅'} 20 JEE/NEET solves per day</li>
                <li>{'✅'} Basic progress tracking</li>
                <li>{'✅'} Hindi + English</li>
                <li className="text-gray-400">{'❌'} Offline mode</li>
                <li className="text-gray-400">{'❌'} Learn Mode</li>
              </ul>
              <a href="/signup" className="block w-full text-center bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">
                Get Started Free
              </a>
            </div>

            {/* Pro */}
            <div className="bg-white rounded-2xl p-8 border-2 border-indigo-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                MOST POPULAR
              </div>
              <h3 className="text-lg font-bold text-gray-900">Pro (Topper)</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-extrabold text-gray-900">₹49</span>
                <span className="text-gray-500 ml-1">/month</span>
                <div className="text-sm text-indigo-600 font-medium mt-1">or ₹399/year (save ₹189)</div>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                <li>{'✅'} Everything in Free</li>
                <li>{'✅'} Unlimited JEE/NEET solves</li>
                <li>{'✅'} Learn Mode</li>
                <li>{'✅'} Offline subject packs</li>
                <li>{'✅'} Mock tests with analysis</li>
                <li>{'✅'} All 11 languages</li>
                <li>{'✅'} No ads, priority AI</li>
              </ul>
              <a href="/signup?plan=pro" className="block w-full text-center bg-indigo-500 text-white py-3 rounded-xl font-semibold hover:bg-indigo-600 transition">
                Start Pro Trial
              </a>
            </div>

            {/* Champion */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Pro+ (Champion)</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-extrabold text-gray-900">₹99</span>
                <span className="text-gray-500 ml-1">/month</span>
                <div className="text-sm text-amber-600 font-medium mt-1">or ₹799/year (save ₹389)</div>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                <li>{'✅'} Everything in Pro</li>
                <li>{'✅'} Live doubt chat</li>
                <li>{'✅'} Personalized study plan</li>
                <li>{'✅'} Parent weekly reports</li>
                <li>{'✅'} AR equation scanner</li>
                <li>{'✅'} Priority support</li>
              </ul>
              <a href="/signup?plan=champion" className="block w-full text-center bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">
                Start Champion Trial
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-indigo-500">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Start Solving in 30 Seconds
          </h2>
          <p className="text-indigo-200 mb-8">
            Join 10 lakh+ Indian students who study smarter with DoubtMaster AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/signup" className="bg-white text-indigo-600 px-8 py-4 rounded-xl text-lg font-bold hover:bg-gray-100 transition">
              Sign Up Free
            </a>
            <a href="#" className="bg-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-indigo-700 transition border border-indigo-400">
              Download App
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <div className="text-white font-bold text-lg mb-4">DoubtMaster AI</div>
            <p className="text-sm">India's #1 AI homework solver. Built for CBSE, ICSE, JEE, NEET students.</p>
          </div>
          <div>
            <div className="font-semibold text-white mb-4">Product</div>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">NCERT Solutions</a></li>
              <li><a href="#" className="hover:text-white">JEE Preparation</a></li>
              <li><a href="#" className="hover:text-white">NEET Preparation</a></li>
              <li><a href="#" className="hover:text-white">Mock Tests</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-white mb-4">Company</div>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">About</a></li>
              <li><a href="#" className="hover:text-white">Careers</a></li>
              <li><a href="#" className="hover:text-white">Blog</a></li>
              <li><a href="#" className="hover:text-white">Contact</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-white mb-4">Legal</div>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white">Refund Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-gray-800 text-sm text-center">
          &copy; 2026 DoubtMaster AI. Made with {'❤️'} in India for Indian students.
        </div>
      </footer>
    </div>
  );
}
