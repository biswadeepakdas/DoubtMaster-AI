'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, BookOpen, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Clock, Calculator, Atom, FlaskConical, Dna, AlertTriangle, RefreshCw,
  FileText, Search, Loader2,
} from 'lucide-react';
import api from '../../lib/api';
import MathRenderer, { MathBlock } from '../../components/MathRenderer';

/* -------------------------------------------------- */
/* Subject badge color mapping (matches dashboard)    */
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
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatDate(dateStr);
}

function truncate(text, max = 120) {
  if (!text) return 'No text available';
  return text.length > max ? text.substring(0, max) + '...' : text;
}

const ITEMS_PER_PAGE = 20;

/* -------------------------------------------------- */
/* Skeleton loader for question rows                   */
/* -------------------------------------------------- */
function QuestionSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="rounded-2xl p-5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-slate-700 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-gray-200 dark:bg-slate-700 rounded-full" />
                <div className="h-5 w-16 bg-gray-200 dark:bg-slate-700 rounded-full" />
              </div>
            </div>
            <div className="h-3 w-16 bg-gray-200 dark:bg-slate-700 rounded shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------- */
/* My Questions Page                                   */
/* -------------------------------------------------- */
export default function QuestionsPage() {
  const router = useRouter();

  // Data states
  const [questions, setQuestions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Expanded question state
  const [expandedId, setExpandedId] = useState(null);
  const [expandedData, setExpandedData] = useState({});  // { [id]: fullQuestionData }
  const [loadingDetail, setLoadingDetail] = useState(null);

  // Page-level states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search (local filter on current page)
  const [searchQuery, setSearchQuery] = useState('');

  /* ---- Auth guard ---- */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('dm-token');
      if (!token) {
        router.replace('/login');
      }
    }
  }, [router]);

  /* ---- Fetch question history ---- */
  const fetchQuestions = useCallback(async (pageNum) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get(`/api/v1/questions/history?page=${pageNum}&limit=${ITEMS_PER_PAGE}`);
      setQuestions(data.questions || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setPage(data.page || pageNum);
    } catch (err) {
      if (err?.status !== 401) {
        setError(err?.message || 'Failed to load question history');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('dm-token')) {
      fetchQuestions(1);
    }
  }, [fetchQuestions]);

  /* ---- Fetch full question detail on expand ---- */
  const handleToggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    // If we already fetched this detail, don't refetch
    if (expandedData[id]) return;

    setLoadingDetail(id);
    try {
      const data = await api.get(`/api/v1/questions/${id}`);
      setExpandedData((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      setExpandedData((prev) => ({
        ...prev,
        [id]: { error: err?.message || 'Failed to load solution' },
      }));
    } finally {
      setLoadingDetail(null);
    }
  };

  /* ---- Pagination handlers ---- */
  const handlePrev = () => {
    if (page > 1) {
      setExpandedId(null);
      fetchQuestions(page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      setExpandedId(null);
      fetchQuestions(page + 1);
    }
  };

  /* ---- Filter by local search ---- */
  const filtered = searchQuery.trim()
    ? questions.filter(
        (q) =>
          (q.extractedText || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (q.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (q.topic || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : questions;

  /* ---- Dark mode detection (inherits from parent layout / dashboard toggle) ---- */
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  /* ============================================== */
  /* RENDER                                          */
  /* ============================================== */

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-[#0F172A]">

      {/* ========== HEADER ========== */}
      <header className="fixed top-0 w-full z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-800 h-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
              <img src="/logo-icon.jpg" alt="DoubtMaster AI" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-lg text-gray-900 dark:text-white hidden sm:block">
              DoubtMaster
            </span>
          </div>
        </div>
      </header>

      {/* ========== MAIN CONTENT ========== */}
      <main className="pt-24 pb-12 px-4 sm:px-6 max-w-5xl mx-auto">

        {/* Page title + search */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                My Questions
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {total > 0
                  ? `You've solved ${total} question${total !== 1 ? 's' : ''} so far`
                  : 'Your question history will appear here'}
              </p>
            </div>

            {/* Search */}
            {total > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl w-full sm:w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                <Search size={16} className="text-gray-400 dark:text-gray-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter by subject, topic, text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none text-sm w-full text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* ========== ERROR STATE ========== */}
        {error && (
          <div className="mb-8 rounded-2xl p-8 text-center border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10">
            <AlertTriangle size={40} className="mx-auto mb-3 text-red-500" />
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">{error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Something went wrong while loading your questions.
            </p>
            <button
              onClick={() => fetchQuestions(page)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
            >
              <RefreshCw size={16} /> Try Again
            </button>
          </div>
        )}

        {/* ========== LOADING STATE ========== */}
        {loading && !error && <QuestionSkeleton />}

        {/* ========== EMPTY STATE ========== */}
        {!loading && !error && questions.length === 0 && (
          <div className="rounded-2xl p-12 text-center border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
            <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-teal-500/10 to-emerald-500/10 dark:from-teal-500/20 dark:to-emerald-500/20 rounded-2xl flex items-center justify-center">
              <BookOpen size={36} className="text-teal-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
              No questions yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Start solving doubts on the dashboard and your question history will appear here.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all"
            >
              <FileText size={18} /> Solve Your First Doubt
            </button>
          </div>
        )}

        {/* ========== QUESTION LIST ========== */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map((q) => {
              const sc = subjectColors[q.subject] || subjectColors.Mathematics;
              const SubjectIcon = subjectIcons[q.subject] || BookOpen;
              const isExpanded = expandedId === q.id;
              const detail = expandedData[q.id];
              const isLoadingThis = loadingDetail === q.id;

              return (
                <div
                  key={q.id}
                  className={`rounded-2xl border transition-all duration-200 ${
                    isExpanded
                      ? 'border-teal-300 dark:border-teal-500/40 shadow-lg shadow-teal-500/5'
                      : 'border-gray-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-500/30'
                  } bg-white dark:bg-slate-800/50`}
                >
                  {/* Question row (clickable) */}
                  <button
                    onClick={() => handleToggleExpand(q.id)}
                    className="w-full text-left p-5 flex items-start gap-4"
                  >
                    {/* Subject icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${sc.bg}`}>
                      <SubjectIcon size={20} className={sc.text} />
                    </div>

                    {/* Text content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
                        {truncate(q.extractedText, 150)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {q.subject && (
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                            {q.subject}
                          </span>
                        )}
                        {q.topic && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {q.topic}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side: date + expand icon */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Clock size={12} />
                        {timeAgo(q.created_at)}
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={18} className="text-teal-500" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                  </button>

                  {/* Expanded solution panel */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-100 dark:border-slate-700">
                      <div className="pt-5">
                        {/* Loading detail */}
                        {isLoadingThis && (
                          <div className="flex items-center justify-center gap-2 py-8">
                            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Loading solution...
                            </span>
                          </div>
                        )}

                        {/* Error loading detail */}
                        {!isLoadingThis && detail?.error && (
                          <div className="text-center py-6">
                            <AlertTriangle size={24} className="mx-auto mb-2 text-red-500" />
                            <p className="text-sm text-red-600 dark:text-red-400">{detail.error}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedData((prev) => {
                                  const copy = { ...prev };
                                  delete copy[q.id];
                                  return copy;
                                });
                                handleToggleExpand(q.id);
                                // Re-trigger by toggling off then on
                                setTimeout(() => handleToggleExpand(q.id), 50);
                              }}
                              className="mt-2 text-sm text-teal-500 hover:text-teal-600 font-medium"
                            >
                              Retry
                            </button>
                          </div>
                        )}

                        {/* Full question + solution */}
                        {!isLoadingThis && detail && !detail.error && (
                          <div className="space-y-5">
                            {/* Full question text */}
                            {detail.extractedText && (
                              <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                                  Full Question
                                </h4>
                                <div className="text-sm text-gray-700 dark:text-gray-300 p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50">
                                  <MathRenderer text={detail.extractedText} />
                                </div>
                              </div>
                            )}

                            {/* Solution steps */}
                            {detail.solution?.steps?.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                                  Step-by-Step Solution
                                </h4>
                                <div className="space-y-3">
                                  {detail.solution.steps.map((step, idx) => (
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
                                        <h5 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                                          {step.title}
                                        </h5>
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
                            {detail.solution?.finalAnswer && (
                              <div className="p-5 rounded-xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10">
                                <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-emerald-700 dark:text-emerald-400">
                                  Final Answer
                                </p>
                                <div className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                                  <MathRenderer text={detail.solution.finalAnswer} />
                                </div>
                              </div>
                            )}

                            {/* Concept tags */}
                            {detail.solution?.conceptTags?.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {detail.solution.conceptTags.map((tag, i) => (
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
                            {detail.solution?.alternativeMethod && (
                              <div className="p-3 rounded-xl text-sm bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400">
                                <span className="font-medium">Alternative method: </span>
                                <MathRenderer text={detail.solution.alternativeMethod} />
                              </div>
                            )}

                            {/* Metadata line */}
                            <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-slate-700">
                              {detail.subject && <span>Subject: {detail.subject}</span>}
                              {detail.topic && <span>Topic: {detail.topic}</span>}
                              {detail.confidence && (
                                <span>{Math.round(detail.confidence * 100)}% confidence</span>
                              )}
                              {detail.createdAt && <span>{formatDate(detail.createdAt)}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* No results from search filter */}
        {!loading && !error && questions.length > 0 && filtered.length === 0 && (
          <div className="rounded-2xl p-8 text-center border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
            <Search size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No questions match &ldquo;{searchQuery}&rdquo; on this page.
            </p>
          </div>
        )}

        {/* ========== PAGINATION ========== */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={handlePrev}
              disabled={page <= 1}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                page <= 1
                  ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-600'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-teal-300 dark:hover:border-teal-500/40 hover:text-teal-600 dark:hover:text-teal-400'
              }`}
            >
              <ChevronLeft size={16} /> Previous
            </button>

            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={handleNext}
              disabled={page >= totalPages}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                page >= totalPages
                  ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-600'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-teal-300 dark:hover:border-teal-500/40 hover:text-teal-600 dark:hover:text-teal-400'
              }`}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
