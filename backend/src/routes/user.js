import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';
import supabase from '../db/supabase.js';

const router = Router();

/**
 * GET /api/user/profile
 */
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const { data: user } = await supabase.from('users')
      .select('id, name, email, phone, class, board, language, plan, role, avatar_url, solve_count, streak, best_streak, created_at')
      .eq('id', req.user.id)
      .single();

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/user/profile
 */
router.put('/profile', authenticate, validate(schemas.updateProfile), async (req, res, next) => {
  try {
    const { name, class: grade, board, language } = req.validated;
    const updates = {};
    if (name) updates.name = name;
    if (grade) updates.class = grade;
    if (board) updates.board = board;
    if (language) updates.language = language;

    const { data: user, error } = await supabase.from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/user/progress — Learning progress dashboard
 */
router.get('/progress', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user stats
    const { data: user } = await supabase.from('users')
      .select('solve_count, streak, best_streak')
      .eq('id', userId)
      .single();

    // Get today's progress
    const today = new Date().toISOString().split('T')[0];
    const { data: todayProgress } = await supabase.from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    // Get last 7 days activity
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: weeklyData } = await supabase.from('user_progress')
      .select('date, questions_solved')
      .eq('user_id', userId)
      .gte('date', weekAgo.toISOString().split('T')[0])
      .order('date');

    // Get subject breakdown from recent questions
    const { data: recentQuestions } = await supabase.from('questions')
      .select('subject')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    const subjectCounts = {};
    for (const q of recentQuestions || []) {
      subjectCounts[q.subject] = (subjectCounts[q.subject] || 0) + 1;
    }

    const totalSolved = user?.solve_count || 0;
    const weeklyActivity = Array(7).fill(0);
    for (const day of weeklyData || []) {
      const dayIndex = new Date(day.date).getDay();
      weeklyActivity[dayIndex] = day.questions_solved;
    }

    res.json({
      overall: {
        totalSolved,
        accuracy: todayProgress?.correct_count && todayProgress?.questions_solved
          ? Math.round((todayProgress.correct_count / todayProgress.questions_solved) * 100)
          : 0,
        streak: user?.streak || 0,
        bestStreak: user?.best_streak || 0,
      },
      bySubject: subjectCounts,
      weakTopics: todayProgress?.weak_topics || [],
      dailyGoal: { target: 10, completed: todayProgress?.questions_solved || 0 },
      weeklyActivity,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/user/streak
 */
router.get('/streak', authenticate, async (req, res, next) => {
  try {
    const { data: user } = await supabase.from('users')
      .select('streak, best_streak')
      .eq('id', req.user.id)
      .single();

    // Get last 30 days of activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activity } = await supabase.from('user_progress')
      .select('date, questions_solved')
      .eq('user_id', req.user.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date');

    const activityMap = new Map();
    for (const day of activity || []) {
      activityMap.set(day.date, day.questions_solved);
    }

    const calendar = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const solved = activityMap.get(dateStr) || 0;
      calendar.push({ date: dateStr, solved, active: solved > 0 });
    }

    res.json({
      currentStreak: user?.streak || 0,
      bestStreak: user?.best_streak || 0,
      streakCalendar: calendar,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
