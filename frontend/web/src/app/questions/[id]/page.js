'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Calculator, Atom, FlaskConical, Dna,
  AlertTriangle, Loader2, Clock,
} from 'lucide-react';
import api from '../../../lib/api';
import MathRenderer, { MathBlock } from '../../../components/MathRenderer';

/* -------------------------------------------------- */
/* Subject badge color / icon mapping                 */
/* -------------------------------------------------- */
const subjectColors = {
  Mathematics: { bg: 'bg-teal-100 dark:bg-teal-500/10', text: 'text-teal-700 dark:text-teal-300' },
  Physics:     { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300' },
  Chemistry:   { bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300' },
  Biology:     { bg: 'bg-pink-100 dark:bg-pink-500/10', text: 'text-pink-700 dark:text-pink-300' },
};

const subjectIcons = {
  Mathematics: Calculator,
  Physics: Atom,
  Chemistry: FlaskConical,
  Biology: Dna,
};

/* -------------------------------------------------- */
/* Helpers                                             */
/* -------------------------------------------------- */
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/* -------------------------------------------------- */
/* Question Detail Page                               */
/* -------------------------------------------------- */
export default function QuestionDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  /* ---- Auth guard ---- */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('dm-token');
      if (!token) {
        router.replace('/login');
      }
    }
  }, [router]);

  /* ---- Fetch question detail ---- */
  useEffect(() => {
    if (!id) return;
    if (typeof window !== 'undefined' && !localStorage.getItem('dm-token')) return;

    async function fetchQuestion() {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);
        const data = await api.get(`/api/v1/questions/${id}`);
        setQuestion(data);
      } catch (err) {
        if (err?.status === 404) {
          setNotFound(true);
        } else if (err?.status !== 401) {
          setError(err?.message || 'Failed to load question');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchQuestion();
  }, [id]);

  /* -------------------------------------------------- */
  /* Derived display values                             */
  /* -------------------------------------------------- */
  const sc = question
    ? subjectColors[question.subject] || subjectColors.Mathematics
    : null;
  const SubjectIcon = question
    ? subjectIcons[question.subject] || BookOpen
    : BookOpen;

  /* ============================================== */
  /* RENDER                                          */
  /* ============================================== */
  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-[#0F172A]">

      {/* ========== HEADER ========== */}
      <header className="fixed top-0 w-full z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-800 h-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <Link
            href="/questions"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Back to Questions</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <div className="flex items-center gap-2">
            <img src="/logo-icon.jpg" alt="DoubtMaster AI" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-lg text-gray-900 dark:text-white hidden sm:block">
              DoubtMaster
            </span>
          </div>
        </div>
      </header>

      {/* ========== MAIN CONTENT ========== */}
      <main className="pt-24 pb-12 px-4 sm:px-6 max-w-3xl mx-auto">

        {/* ========== LOADING STATE ========== */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 size={40} className="animate-spin text-teal-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading question...</p>
          </div>
        )}

        {/* ========== NOT FOUND STATE ========== */}
        {!loading && notFound && (
          <div className="rounded-2xl p-12 text-center border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center">
              <BookOpen size={32} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              Question not found
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              This question may have been removed or the link is incorrect.
            </p>
            <Link
              href="/questions"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all"
            >
              <ArrowLeft size={18} /> Back to Questions
            </Link>
          </div>
        )}

        {/* ========== ERROR STATE ========== */}
        {!loading && error && (
          <div className="rounded-2xl p-8 text-center border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10">
            <AlertTriangle size={40} className="mx-auto mb-3 text-red-500" />
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">{error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Something went wrong while loading this question.
            </p>
            <Link
              href="/questions"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
            >
              <ArrowLeft size={16} /> Back to Questions
            </Link>
          </div>
        )}

        {/* ========== QUESTION DETAIL ========== */}
        {!loading && question && !notFound && !error && (
          <div className="space-y-6">

            {/* Question header card */}
            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6">
              {/* Subject / topic badges */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {question.subject && sc && (
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${sc.bg} ${sc.text}`}>
                    <SubjectIcon size={14} />
                    {question.subject}
                  </div>
                )}
                {question.topic && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                    {question.topic}
                  </span>
                )}
              </div>

              {/* Question text */}
              {question.extractedText && (
                <div>
                  <h1 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    Question
                  </h1>
                  <div className="text-base text-gray-800 dark:text-gray-200 leading-relaxed">
                    <MathRenderer text={question.extractedText} />
                  </div>
                </div>
              )}

              {/* Metadata line */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-400 dark:text-gray-500">
                {(question.createdAt || question.created_at) && (
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatDate(question.createdAt || question.created_at)}
                  </div>
                )}
                {question.confidence && (
                  <span>{Math.round(question.confidence * 100)}% confidence</span>
                )}
              </div>
            </div>

            {/* Solution steps */}
            {question.solution?.steps?.length > 0 && (
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
                  Step-by-Step Solution
                </h2>
                <div className="space-y-3">
                  {question.solution.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border-l-4 border-teal-500 bg-gray-50 dark:bg-slate-700/50"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-bold">
                            {step.stepNumber || idx + 1}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                          {step.title}
                        </h3>
                      </div>
                      <div className="text-sm ml-10 text-gray-700 dark:text-gray-300">
                        <MathRenderer text={step.content} />
                      </div>
                      {step.formula && (
                        <div className="ml-10 mt-2 p-3 rounded-lg text-sm overflow-x-auto bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                          <MathBlock text={step.formula} />
                        </div>
                      )}
                      {step.explanation && (
                        <p className="ml-10 mt-2 text-xs italic text-gray-400 dark:text-gray-500">
                          <MathRenderer text={step.explanation} />
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final answer */}
            {question.solution?.finalAnswer && (
              <div className="p-5 rounded-xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10">
                <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-emerald-700 dark:text-emerald-400">
                  Final Answer
                </p>
                <div className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                  <MathRenderer text={question.solution.finalAnswer} />
                </div>
              </div>
            )}

            {/* Concept tags */}
            {question.solution?.conceptTags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {question.solution.conceptTags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Alternative method */}
            {question.solution?.alternativeMethod && (
              <div className="p-3 rounded-xl text-sm bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400">
                <span className="font-medium">Alternative method: </span>
                <MathRenderer text={question.solution.alternativeMethod} />
              </div>
            )}

            {/* Back link at bottom */}
            <div className="pt-2">
              <Link
                href="/questions"
                className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Questions
              </Link>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
