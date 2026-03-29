'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, TrendingUp, BookOpen, Award,
  Sun, Moon, AlertTriangle, RefreshCw, BarChart3,
  Clock, Flame, CheckCircle
} from 'lucide-react';
import api from '../../lib/api';

export default function TeacherDashboard() {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [topTopics, setTopTopics] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dm-dark');
      if (saved === 'true') { setDark(true); document.documentElement.classList.add('dark'); }
      const token = localStorage.getItem('dm-token');
      if (!token) { router.replace('/login'); return; }
    }
    fetchData();
  }, []);

  const toggleDark = () => {
    setDark(d => {
      document.documentElement.classList.toggle('dark', !d);
      localStorage.setItem('dm-dark', String(!d));
      return !d;
    });
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [studentsRes, topicsRes] = await Promise.allSettled([
        api.get('/api/v1/admin/students'),
        api.get('/api/v1/admin/top-topics'),
      ]);
      if (studentsRes.status === 'fulfilled') {
        const data = studentsRes.value;
        setStudents(data.students || []);
        setStats({
          totalStudents: data.total || (data.students || []).length,
          activeToday: (data.students || []).filter(s => {
            if (!s.last_active_at) return false;
            const last = new Date(s.last_active_at);
            const now = new Date();
            return now - last < 24 * 60 * 60 * 1000;
          }).length,
          avgSolveCount: (data.students || []).length > 0
            ? Math.round((data.students || []).reduce((a, s) => a + (s.solve_count || 0), 0) / (data.students || []).length)
            : 0,
          totalSolved: (data.students || []).reduce((a, s) => a + (s.solve_count || 0), 0),
        });
      } else {
        setError(studentsRes.reason?.message || 'Failed to load students. Teacher access may be required.');
      }
      if (topicsRes.status === 'fulfilled') {
        setTopTopics(topicsRes.value.topics || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load teacher data');
    } finally {
      setLoading(false);
    }
  };

  function timeAgo(dateStr) {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="rounded-2xl p-5 bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F172A] transition-colors duration-300">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-800 h-16">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
              <img src="/logo-icon.jpg" alt="DoubtMaster AI" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-lg text-gray-900 dark:text-white hidden sm:block">Teacher Dashboard</span>
          </div>
          <button onClick={toggleDark} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            {dark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-gray-600" />}
          </button>
        </div>
      </header>

      <main className="pt-24 pb-12 px-4 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Class Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor student activity and progress</p>
        </div>

        {/* Error state */}
        {error && !loading && (
          <div className="mb-8 rounded-2xl p-8 text-center border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10">
            <AlertTriangle size={40} className="mx-auto mb-3 text-red-500" />
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">{error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Make sure your account has teacher or admin access.</p>
            <button onClick={fetchData} className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors">
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Stats grid */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon={Users} label="Total Students" value={stats.totalStudents} color="bg-teal-500" />
                <StatCard icon={TrendingUp} label="Active Today" value={stats.activeToday} color="bg-emerald-500" />
                <StatCard icon={BarChart3} label="Avg Doubts Solved" value={stats.avgSolveCount} color="bg-blue-500" />
                <StatCard icon={BookOpen} label="Total Doubts Solved" value={stats.totalSolved} color="bg-purple-500" />
              </div>
            )}

            {/* Students table */}
            {students.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 mb-8 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users size={20} className="text-teal-500" /> Student Activity
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-700">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Solved</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Streak</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Active</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {students.map((s, i) => (
                        <tr key={s.id || i} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                                {(s.name || 'S')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name || 'Unknown'}</p>
                                <p className="text-xs text-gray-400">{s.email || s.phone || ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{s.class ? `Class ${s.class}` : '—'}</td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">{s.solve_count || 0}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-1 text-sm text-orange-500">
                              <Flame size={14} /> {s.streak || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <Clock size={12} /> {timeAgo(s.last_active_at)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.plan === 'pro' || s.plan === 'champion' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'}`}>
                              {s.plan || 'free'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top topics */}
            {topTopics.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp size={20} className="text-teal-500" /> Top Doubt Topics
                  </h2>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {topTopics.slice(0, 9).map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-700/40">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="text-sm text-gray-700 dark:text-gray-200">{t.topic}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {students.length === 0 && !error && (
              <div className="rounded-2xl p-12 text-center border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <Users size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">No students yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Student activity will appear here once they start solving doubts.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
