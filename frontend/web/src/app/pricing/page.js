'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, X } from 'lucide-react';

export default function Pricing() {
  const [toast, setToast] = useState(false);

  function handleSubscribe(plan) {
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-xl text-sm font-medium">
          Payment integration coming soon!
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/logo-icon.jpg" alt="DoubtMaster AI" className="w-9 h-9 rounded-xl object-cover" />
            <span className="font-bold text-xl text-gray-900">
              DoubtMaster <span className="text-teal-500">AI</span>
            </span>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Simple Pricing</h1>
          <p className="text-gray-500 text-lg">Pick the plan that fits your study goals.</p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Free */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Free (Muft)</h2>
            <div className="mt-3 mb-6">
              <span className="text-4xl font-extrabold text-gray-900">&#8377;0</span>
              <span className="ml-1 text-gray-500">forever</span>
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
                <li
                  key={text}
                  className={`flex items-center gap-2 ${included ? 'text-gray-700' : 'text-gray-500'}`}
                >
                  {included
                    ? <Check size={16} className="text-emerald-500 shrink-0" />
                    : <X size={16} className="text-gray-300 shrink-0" />}
                  {text}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block w-full text-center bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-white border-2 border-blue-600 rounded-2xl p-8 relative overflow-visible">
            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border-2 border-white bg-indigo-600 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-md ring-2 ring-indigo-600/30">
              Most popular
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Pro (Topper)</h2>
            <div className="mt-3 mb-6">
              <span className="text-4xl font-extrabold text-gray-900">&#8377;199</span>
              <span className="ml-1 text-gray-500">/month</span>
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
                <li key={text} className="flex items-center gap-2 text-gray-700">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe('pro')}
              className="block w-full text-center bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all"
            >
              Subscribe — &#8377;199/month
            </button>
          </div>
        </div>

        {/* Premium Coming Soon */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-8 mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h2 className="text-lg font-bold text-gray-900">Premium (Coming Soon)</h2>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
              EARLY ACCESS SOON
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            We are preparing advanced options for serious exam prep. You will be able to pick a Premium variant soon.
          </p>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm text-gray-700">
            {[
              'Live doubt chat',
              'Personalized study plans',
              'Parent weekly reports',
              'Advanced analytics and insights',
            ].map((text) => (
              <li key={text} className="flex items-center gap-2">
                <Check size={16} className="text-emerald-600 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:underline"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
