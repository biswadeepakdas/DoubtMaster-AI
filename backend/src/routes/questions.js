import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { solveLimiter } from '../middleware/rateLimiter.js';
import { validate, schemas } from '../middleware/validate.js';
import { AppError } from '../middleware/error.js';
import { solveQuestion, evaluateLearnMode } from '../services/solver.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Multer config for image uploads (10MB max)
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only JPEG, PNG, WebP, HEIC images allowed', 400, 'INVALID_FILE'));
    }
  },
  storage: multer.memoryStorage(),
});

// In-memory question store (replace with DB in production)
const questions = new Map();

/**
 * POST /api/questions/solve
 * Upload image → get AI solution
 */
router.post('/solve', authenticate, solveLimiter, upload.single('image'), async (req, res, next) => {
  try {
    const { subject, class: grade, board, language } = req.body;

    if (!req.file && !req.body.textQuestion) {
      throw new AppError('Image or text question required', 400, 'VALIDATION_ERROR');
    }

    const questionId = uuidv4();
    const startTime = Date.now();

    logger.info(`Solving question ${questionId} for user ${req.user.id}`);

    const result = await solveQuestion({
      id: questionId,
      userId: req.user.id,
      image: req.file?.buffer,
      textQuestion: req.body.textQuestion,
      subject,
      class: grade ? parseInt(grade, 10) : undefined,
      board,
      language: language || 'en',
      userPlan: req.user.plan,
    });

    const question = {
      id: questionId,
      userId: req.user.id,
      extractedText: result.extractedText,
      subject: result.subject,
      topic: result.topic,
      class: grade,
      board,
      solution: result.solution,
      createdAt: new Date().toISOString(),
      solveTimeMs: Date.now() - startTime,
    };

    questions.set(questionId, question);

    res.json({
      questionId,
      extractedText: result.extractedText,
      subject: result.subject,
      topic: result.topic,
      confidence: result.confidence,
      solution: {
        steps: result.solution.steps,
        finalAnswer: req.user.plan !== 'free' ? result.solution.finalAnswer : undefined,
        learnModeRequired: req.user.plan === 'free',
        totalSteps: result.solution.steps.length,
      },
      solveTimeMs: Date.now() - startTime,
      dailyRemaining: req.user.plan === 'free' ? 'Check X-RateLimit-Remaining header' : 'unlimited',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/questions/text-solve
 * Text input → get solution
 */
router.post('/text-solve', authenticate, solveLimiter, validate(schemas.solveQuestion), async (req, res, next) => {
  try {
    const { textQuestion, subject, class: grade, board, language } = req.validated;
    if (!textQuestion) {
      throw new AppError('Text question required', 400, 'VALIDATION_ERROR');
    }

    const questionId = uuidv4();
    const startTime = Date.now();

    const result = await solveQuestion({
      id: questionId,
      userId: req.user.id,
      textQuestion,
      subject,
      class: grade,
      board,
      language,
      userPlan: req.user.plan,
    });

    questions.set(questionId, {
      id: questionId,
      userId: req.user.id,
      extractedText: textQuestion,
      ...result,
      createdAt: new Date().toISOString(),
    });

    res.json({
      questionId,
      ...result,
      solveTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/questions/history
 * User's question history
 */
router.get('/history', authenticate, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const userQuestions = [...questions.values()]
    .filter((q) => q.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const start = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const paginated = userQuestions.slice(start, start + parseInt(limit, 10));

  res.json({
    questions: paginated.map((q) => ({
      id: q.id,
      extractedText: q.extractedText?.substring(0, 100),
      subject: q.subject,
      topic: q.topic,
      createdAt: q.createdAt,
    })),
    total: userQuestions.length,
    page: parseInt(page, 10),
    totalPages: Math.ceil(userQuestions.length / parseInt(limit, 10)),
  });
});

/**
 * GET /api/questions/:id
 * Get specific question + solution
 */
router.get('/:id', authenticate, (req, res) => {
  const question = questions.get(req.params.id);
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }
  if (question.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(question);
});

/**
 * POST /api/questions/:id/learn
 * Submit Learn Mode response for evaluation
 */
router.post('/:id/learn', authenticate, async (req, res, next) => {
  try {
    const question = questions.get(req.params.id);
    if (!question) {
      throw new AppError('Question not found', 404, 'NOT_FOUND');
    }

    const { response } = req.body;
    if (!response || response.length < 10) {
      throw new AppError('Please provide a detailed explanation (min 10 characters)', 400, 'VALIDATION_ERROR');
    }

    const evaluation = await evaluateLearnMode({
      question: question.extractedText,
      solution: question.solution,
      studentResponse: response,
    });

    res.json({
      score: evaluation.score,
      passed: evaluation.passed,
      feedback: evaluation.feedback,
      finalAnswer: evaluation.passed ? question.solution.finalAnswer : undefined,
      hint: !evaluation.passed ? evaluation.hint : undefined,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
