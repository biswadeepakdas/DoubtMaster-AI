'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sun, Moon, ArrowLeft, Flame, Target, Award, Trophy,
  Zap, Crown, Shield, CheckCircle, Clock, TrendingUp,
  BookOpen, Layers, Sunrise, Star, ChevronRight,
  Snowflake, RefreshCw, Users
} from 'lucide-react';
import api from '../../lib/api';

/* -------------------------------------------------- */
/* Badge icon mapping                                 */
/* -------------------------------------------------- */
const badgeIcons = {
  zap: Zap, flame: Flame, trophy: Trophy, crown: Crown,
  'book-open': BookOpen, target: Target, award: Award,
  rocket: TrendingUp, 'check-circle': CheckCircle, shield: Shield,
  layers: Layers, moon: Moon, sunrise: Sunrise, star: Star,
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* -------------------------------------------------- */
/* Streaks & Daily Goals Page                         */
/* -------------------------------------------------- */
export default function StreaksPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [data, setData] = useState(null);
  const [achievements, setAchievements] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalSolves, setGoalSolves] = useState(5);
  const [goalMinutes, setGoalMinutes] = useState(30);
  const [freezeLoading, setFreezeLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/v1/streaks/dashboard');
      setData(res);
      setGoalSolves(res.dailyGoal?.targetSolves || 5);
      setGoalMinutes(res.dailyGoal?.targetMinutes || 30);
    } catch (err) {
      if (err?.status !== 401) setError(err?.message || 'Failed to load streak data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAchievements = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/streaks/achievements');
      setAchievements(res);
    } catch (err) { /* ignore */ }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/streaks/leaderboard');
      setLeaderboard(res);
    } catch (err) { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('dm-token');
      if (!token) { router.replace('/login'); return; }
      const savedDark = localStorage.getItem('dm-dark');
      if (savedDark === 'true') setDarkMode(true);
      fetchDashboard();
      fetchAchievements();
      fetchLeaderboard();
    }
  }, [router, fetchDashboard, fetchAchievements, fetchLeaderboard]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    if (typeof window !== 'undefined') localStorage.setItem('dm-dark', String(darkMode));
  }, [darkMode]);

  const handleUpdateGoals = async () => {
    try {
      await api.put('/api/v1/streaks/goals', {
        target_solves: goalSolves,
        target_minutes: goalMinutes,
      });
      setEditingGoals(false);
      fetchDashboard();
    } catch (err) {
      alert(err?.message || 'Failed to update goals');
    }
  };

  const handleFreeze = async () => {
    setFreezeLoading(true);
    try {
      const res = await api.post('/api/v1/streaks/freeze');
      alert(res.message);
      fetchDashboard();
    } catch (err) {
      alert(err?.message || 'Failed to use streak freeze');
    } finally {
      setFreezeLoading(false);
    }
  };

  /* ---- Render helpers ---- */

  const renderStreakRing = () => {
    if (!data) return null;
    const streak = data.streak?.current || 0;
    const progress = data.dailyGoal?.solveProgress || 0;
    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative w-40 h-40 mx-auto">
        <svg className="transform -rotate-90 w-40 h-40">
          <circle cx="80" cy="80" r="60" strokeWidth="8"
            className="stroke-gray-200 dark:stroke-gray-700" fill="none" />
          <circle cx="80" cy="80" r="60" strokeWidth="8"
            className="stroke-orange-500" fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Flame className="w-6 h-6 text-orange-500" />
          <span className="text-3xl font-bold dark:text-white">{streak}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">day streak</span>
        </div>
      </div>
    );
  };

  const renderWeekChart = () => {
    if (!data?.weekActivity) return null;
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const activity = data.weekActivity.find(a => String(a.date) === dateStr);
      days.push({
        label: DAY_LABELS[d.getDay()],
        solves: activity?.actual_solves || 0,
        completed: activity?.completed || false,
        isToday: i === 0,
      });
    }
    const maxSolves = Math.max(...days.map(d => d.solves), 1);

    return (
      <div className="flex items-end justify-between gap-2 h-32 px-2">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center flex-1 gap-1">
            <div className="w-full flex justify-center" style={{ height: '80px' }}>
              <div
                className={`w-6 rounded-t transition-all ${
                  d.completed ? 'bg-gradient-to-t from-orange-500 to-amber-400' :
                  d.solves > 0 ? 'bg-gradient-to-t from-orange-300 to-amber-200' :
                  'bg-gray-200 dark:bg-gray-700'
                } ${d.isToday ? 'ring-2 ring-orange-400' : ''}`}
                style={{ height: `${Math.max((d.solves / maxSolves) * 80, 4)}px`, marginTop: 'auto' }}
              />
            </div>
            <span className={`text-[10px] font-medium ${d.isToday ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'}`}>
              {d.label}
            </span>
            {d.solves > 0 && (
              <span className="text-[9px] text-gray-400">{d.solves}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'dark bg-gray-950' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-gray-500">Loading your streak data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'dark bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-950/80 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft className="w-5 h-5" /> <span className="font-medium">Dashboard</span>
          </button>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" /> Study Streaks
          </h1>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Tab nav */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {[
            { key: 'overview', label: 'Overview', icon: Flame },
            { key: 'achievements', label: 'Badges', icon: Award },
            { key: 'leaderboard', label: 'Leaderboard', icon: Users },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-orange-600 dark:text-orange-400'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && data && (
          <div className="space-y-6">
            {/* Streak ring + stats */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
              {renderStreakRing()}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-500">{data.streak?.current || 0}</p>
                  <p className="text-xs text-gray-500">Current</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-500">{data.streak?.best || 0}</p>
                  <p className="text-xs text-gray-500">Best</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-teal-500">{data.totalSolved || 0}</p>
                  <p className="text-xs text-gray-500">Total Solved</p>
                </div>
              </div>
            </div>

            {/* Daily Goal */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-500" /> Daily Goal
                </h2>
                <button onClick={() => setEditingGoals(!editingGoals)}
                  className="text-sm text-indigo-500 hover:text-indigo-600 font-medium">
                  {editingGoals ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {data.dailyGoal?.completed && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="w-5 h-5" /> Daily goal completed!
                </div>
              )}

              {editingGoals ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Questions to solve</label>
                    <input type="range" min="1" max="30" value={goalSolves} onChange={e => setGoalSolves(Number(e.target.value))}
                      className="w-full accent-indigo-500" />
                    <p className="text-right text-sm font-medium">{goalSolves} questions</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Study time</label>
                    <input type="range" min="5" max="120" step="5" value={goalMinutes} onChange={e => setGoalMinutes(Number(e.target.value))}
                      className="w-full accent-indigo-500" />
                    <p className="text-right text-sm font-medium">{goalMinutes} minutes</p>
                  </div>
                  <button onClick={handleUpdateGoals}
                    className="w-full py-2 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors">
                    Save Goals
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Questions: {data.dailyGoal?.actualSolves}/{data.dailyGoal?.targetSolves}</span>
                      <span className="font-medium">{data.dailyGoal?.solveProgress}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                        style={{ width: `${data.dailyGoal?.solveProgress || 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Minutes: {data.dailyGoal?.actualMinutes}/{data.dailyGoal?.targetMinutes}</span>
                      <span className="font-medium">{data.dailyGoal?.minuteProgress}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all"
                        style={{ width: `${data.dailyGoal?.minuteProgress || 0}%` }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Week chart */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-500" /> This Week
              </h2>
              {renderWeekChart()}
            </div>

            {/* Streak freeze */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    <Snowflake className="w-5 h-5 text-blue-400" /> Streak Freezes
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Protect your streak on days you miss. {data.freezes?.remaining || 0} of {data.freezes?.max || 1} remaining this month.
                  </p>
                </div>
                <button
                  onClick={handleFreeze}
                  disabled={freezeLoading || (data.freezes?.remaining || 0) === 0}
                  className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {freezeLoading ? 'Using...' : 'Use Freeze'}
                </button>
              </div>
            </div>

            {/* Recent badges */}
            {data.recentBadges?.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" /> Recent Badges
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {data.recentBadges.map((badge, i) => {
                    const Icon = badgeIcons[badge.icon] || Award;
                    return (
                      <div key={i} className="flex-shrink-0 w-20 text-center">
                        <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-xs font-medium mt-1 truncate">{badge.title}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Achievements tab */}
        {activeTab === 'achievements' && achievements && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-3xl font-bold">{achievements.totalEarned} <span className="text-lg text-gray-500">/ {achievements.totalAvailable}</span></p>
              <p className="text-sm text-gray-500">badges earned</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {achievements.achievements?.map(badge => {
                const Icon = badgeIcons[badge.icon] || Award;
                return (
                  <div
                    key={badge.badgeKey}
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      badge.earned
                        ? 'bg-white dark:bg-gray-900 border-yellow-300 dark:border-yellow-600 shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50'
                    }`}
                  >
                    <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                      badge.earned
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      <Icon className={`w-6 h-6 ${badge.earned ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <p className="text-sm font-bold mt-2">{badge.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{badge.description}</p>
                    {badge.earned && badge.earnedAt && (
                      <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-1">
                        Earned {new Date(badge.earnedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leaderboard tab */}
        {activeTab === 'leaderboard' && leaderboard && (
          <div className="space-y-3">
            {leaderboard.leaderboard?.map(entry => (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                  entry.isMe
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                  entry.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                  entry.rank === 2 ? 'bg-gray-300 text-gray-700' :
                  entry.rank === 3 ? 'bg-orange-300 text-orange-800' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}>
                  {entry.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {entry.name} {entry.isMe && <span className="text-xs text-orange-500">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-500">{entry.solveCount} total solves</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-500 flex items-center gap-1">
                    <Flame className="w-4 h-4" /> {entry.streak}
                  </p>
                  <p className="text-[10px] text-gray-400">day streak</p>
                </div>
              </div>
            ))}
            {(!leaderboard.leaderboard || leaderboard.leaderboard.length === 0) && (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No active streakers yet. Start solving to appear here!</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
