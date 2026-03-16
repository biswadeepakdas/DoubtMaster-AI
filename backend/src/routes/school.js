import { Router } from 'express';
import { authenticate, requireTeacher } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/school/register
 * Register a school
 */
router.post('/register', authenticate, (req, res) => {
  const { schoolName, board, city, state } = req.body;
  res.status(201).json({
    message: 'School registered successfully',
    school: {
      id: `school_${Date.now()}`,
      name: schoolName,
      board,
      city,
      state,
      adminId: req.user.id,
      createdAt: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/school/students
 * List students in school
 */
router.get('/students', authenticate, requireTeacher, (req, res) => {
  res.json({
    students: [
      { id: 'demo1', name: 'Aarav Sharma', class: 10, totalSolved: 150, accuracy: 82, streak: 7, lastActive: '2026-03-15' },
      { id: 'demo2', name: 'Priya Patel', class: 10, totalSolved: 200, accuracy: 91, streak: 14, lastActive: '2026-03-16' },
      { id: 'demo3', name: 'Rahul Kumar', class: 10, totalSolved: 80, accuracy: 65, streak: 3, lastActive: '2026-03-14' },
    ],
    total: 3,
  });
});

/**
 * GET /api/school/analytics
 * Class-level analytics
 */
router.get('/analytics', authenticate, requireTeacher, (req, res) => {
  res.json({
    classOverview: {
      totalStudents: 45,
      activeToday: 32,
      averageAccuracy: 78,
      topSubject: 'Math',
      weakestTopic: 'Trigonometry',
    },
    subjectBreakdown: {
      math: { avgAccuracy: 82, totalSolved: 1200 },
      physics: { avgAccuracy: 75, totalSolved: 800 },
      chemistry: { avgAccuracy: 71, totalSolved: 600 },
      biology: { avgAccuracy: 85, totalSolved: 500 },
    },
    weeklyTrend: [65, 70, 72, 75, 78, 80, 78],
    topPerformers: [
      { name: 'Priya Patel', accuracy: 91, solved: 200 },
      { name: 'Aarav Sharma', accuracy: 82, solved: 150 },
    ],
    needsAttention: [
      { name: 'Rahul Kumar', accuracy: 65, weakTopics: ['Trigonometry', 'Optics'] },
    ],
  });
});

/**
 * GET /api/school/student/:id
 * Individual student report
 */
router.get('/student/:id', authenticate, requireTeacher, (req, res) => {
  res.json({
    student: {
      id: req.params.id,
      name: 'Demo Student',
      class: 10,
      board: 'CBSE',
    },
    progress: {
      totalSolved: 150,
      accuracy: 82,
      streak: 7,
      learnModePassRate: 75,
      timeSpent: '45 hrs',
    },
    topicMastery: [
      { topic: 'Algebra', mastery: 90, questionsAttempted: 30 },
      { topic: 'Geometry', mastery: 85, questionsAttempted: 25 },
      { topic: 'Trigonometry', mastery: 55, questionsAttempted: 20 },
    ],
    recentActivity: [
      { date: '2026-03-16', solved: 8, accuracy: 87 },
      { date: '2026-03-15', solved: 12, accuracy: 75 },
    ],
  });
});

export default router;
