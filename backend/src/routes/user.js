import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';

const router = Router();

// In-memory progress store
const progressStore = new Map();

/**
 * GET /api/user/profile
 */
router.get('/profile', authenticate, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    plan: req.user.plan,
    role: req.user.role,
  });
});

/**
 * PUT /api/user/profile
 */
router.put('/profile', authenticate, validate(schemas.updateProfile), (req, res) => {
  // In production: update DB
  res.json({
    message: 'Profile updated',
    updated: req.validated,
  });
});

/**
 * GET /api/user/progress
 * Learning progress dashboard data
 */
router.get('/progress', authenticate, (req, res) => {
  const userId = req.user.id;
  const progress = progressStore.get(userId) || getDefaultProgress();

  res.json({
    overall: {
      totalSolved: progress.totalSolved,
      accuracy: progress.accuracy,
      streak: progress.streak,
      bestStreak: progress.bestStreak,
      rank: progress.rank,
    },
    bySubject: progress.subjects,
    weakTopics: progress.weakTopics,
    dailyGoal: { target: 10, completed: progress.todaySolved },
    weeklyActivity: progress.weeklyActivity,
  });
});

/**
 * GET /api/user/weaknesses
 * AI-detected weakness analysis
 */
router.get('/weaknesses', authenticate, (req, res) => {
  res.json({
    weakTopics: [
      { subject: 'math', topic: 'Trigonometry', errorRate: 0.45, questionsAttempted: 20, suggestion: 'Practice NCERT Ch.8 exercises' },
      { subject: 'physics', topic: 'Optics', errorRate: 0.35, questionsAttempted: 12, suggestion: 'Review ray diagrams' },
      { subject: 'chemistry', topic: 'Organic Reactions', errorRate: 0.30, questionsAttempted: 15, suggestion: 'Focus on mechanism steps' },
    ],
    recommendations: [
      { type: 'practice', title: 'Trigonometry Basics', questionCount: 10, estimatedTime: '15 min' },
      { type: 'revision', title: 'Optics Formulas', questionCount: 5, estimatedTime: '10 min' },
    ],
  });
});

/**
 * GET /api/user/streak
 */
router.get('/streak', authenticate, (req, res) => {
  res.json({
    currentStreak: 7,
    bestStreak: 21,
    todaySolved: 5,
    todayGoal: 10,
    streakCalendar: generateStreakCalendar(),
  });
});

function getDefaultProgress() {
  return {
    totalSolved: 0,
    accuracy: 0,
    streak: 0,
    bestStreak: 0,
    rank: 'Beginner',
    todaySolved: 0,
    subjects: {
      math: { solved: 0, accuracy: 0, level: 'Beginner' },
      physics: { solved: 0, accuracy: 0, level: 'Beginner' },
      chemistry: { solved: 0, accuracy: 0, level: 'Beginner' },
      biology: { solved: 0, accuracy: 0, level: 'Beginner' },
    },
    weakTopics: [],
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
  };
}

function generateStreakCalendar() {
  const calendar = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    calendar.push({
      date: date.toISOString().split('T')[0],
      solved: Math.floor(Math.random() * 15),
      active: Math.random() > 0.3,
    });
  }
  return calendar;
}

export default router;
