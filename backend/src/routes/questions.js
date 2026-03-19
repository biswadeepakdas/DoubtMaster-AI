import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { solveLimiter } from '../middleware/rateLimiter.js';
import { validate, schemas } from '../middleware/validate.js';
import { AppError } from '../middleware/error.js';
import { solveQuestion, evaluateLearnMode } from '../services/solver.js';
import { logger } from '../utils/logger.js';
import supabase from '../db/supabase.js';

const router = Router();

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new AppError('Only JPEG, PNG, WebP, HEIC images allowed', 400, 'INVALID_FILE'));
  },
  storage: multer.memoryStorage(),
});

/**
 * POST /api/questions/solve — Image upload → AI solution
 */
router.post('/solve', authenticate, solveLimiter, upload.single('image'), async (req, res, next) => {
  try {
    const { subject, class: grade, board, language } = req.body;

    if (!req.file && !req.body.textQuestion) {
      throw new AppError('Image or text question required', 400, 'VALIDATION_ERROR');
    }

    const startTime = Date.now();

    const result = await solveQuestion({
      userId: req.user.id,
      image: req.file?.buffer,
      textQuestion: req.body.textQuestion,
      subject,
      class: grade ? parseInt(grade, 10) : undefined,
      board,
      language: language || 'en',
      userPlan: req.user.plan,
    });

    const solveTimeMs = Date.now() - startTime;

    // Save question to DB
    const { data: question, error: qErr } = await supabase.from('questions').insert({
      user_id: req.user.id,
      text: result.extractedText,
      subject: result.subject,
      topic: result.topic,
      class: grade ? parseInt(grade, 10) : null,
      board: board || 'CBSE',
      difficulty: result.difficulty,
      language: language || 'en',
      source: req.file ? 'image' : 'text',
      solve_time_ms: solveTimeMs,
    }).select().single();

    if (qErr) logger.error(`Failed to save question: ${qErr.message}`);

    // Save solution to DB
    if (question) {
      const { error: sErr } = await supabase.from('solutions').insert({
        question_id: question.id,
        steps: result.solution.steps,
        final_answer: result.solution.finalAnswer || '',
        confidence: result.confidence,
        model_used: result.modelUsed,
        concept_tags: result.solution.conceptTags || [],
        related_pyqs: result.solution.relatedPYQs || [],
        alternative_method: result.solution.alternativeMethod,
        from_cache: result.fromCache || false,
      });
      if (sErr) logger.error(`Failed to save solution: ${sErr.message}`);

      // Increment user solve count
      await supabase.rpc('increment_solve_count', { user_id_param: req.user.id }).catch(async () => {
        // Fallback if RPC doesn't exist yet: fetch current count and increment
        try {
          const { data: userData } = await supabase.from('users').select('solve_count').eq('id', req.user.id).single();
          const newCount = (userData?.solve_count || 0) + 1;
          await supabase.from('users').update({ solve_count: newCount }).eq('id', req.user.id);
        } catch (e) {
          logger.warn(`Failed to increment solve count: ${e.message}`);
        }
      });
    }

    // Free plan: show only first 2 steps to encourage Learn Mode
    const allSteps = result.solution.steps;
    const visibleSteps = allSteps;

    res.json({
      questionId: question?.id,
      extractedText: result.extractedText,
      subject: result.subject,
      topic: result.topic,
      confidence: result.confidence,
      solution: {
        steps: visibleSteps,
        finalAnswer: result.solution.finalAnswer,
        learnModeRequired: false,
        totalSteps: allSteps.length,
        visibleSteps: visibleSteps.length,
        conceptTags: result.solution.conceptTags || [],
        alternativeMethod: result.solution.alternativeMethod || null,
        relatedPYQs: result.solution.relatedPYQs || [],
        diagram: result.solution.diagram || null,
      },
      solveTimeMs,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/questions/text-solve — Text input → solution
 */
router.post('/text-solve', authenticate, solveLimiter, validate(schemas.solveQuestion), async (req, res, next) => {
  try {
    const { textQuestion, subject, class: grade, board, language } = req.validated;
    if (!textQuestion) throw new AppError('Text question required', 400, 'VALIDATION_ERROR');

    const startTime = Date.now();

    const result = await solveQuestion({
      userId: req.user.id,
      textQuestion,
      subject,
      class: grade,
      board,
      language,
      userPlan: req.user.plan,
    });

    const solveTimeMs = Date.now() - startTime;

    // Save to DB
    const { data: question } = await supabase.from('questions').insert({
      user_id: req.user.id,
      text: textQuestion,
      subject: result.subject,
      topic: result.topic,
      class: grade || null,
      board: board || 'CBSE',
      difficulty: result.difficulty,
      language: language || 'en',
      source: 'text',
      solve_time_ms: solveTimeMs,
    }).select().single();

    if (question) {
      await supabase.from('solutions').insert({
        question_id: question.id,
        steps: result.solution.steps,
        final_answer: result.solution.finalAnswer || '',
        confidence: result.confidence,
        model_used: result.modelUsed,
        concept_tags: result.solution.conceptTags || [],
        from_cache: result.fromCache || false,
      });
    }

    // Free plan: show only first 2 steps to encourage Learn Mode
    const allSteps = result.solution.steps;
    const visibleSteps = allSteps;

    res.json({
      questionId: question?.id,
      extractedText: result.extractedText,
      subject: result.subject,
      topic: result.topic,
      confidence: result.confidence,
      solution: {
        steps: visibleSteps,
        finalAnswer: result.solution.finalAnswer,
        learnModeRequired: false,
        totalSteps: allSteps.length,
        visibleSteps: visibleSteps.length,
        conceptTags: result.solution.conceptTags || [],
        alternativeMethod: result.solution.alternativeMethod || null,
        relatedPYQs: result.solution.relatedPYQs || [],
        diagram: result.solution.diagram || null,
      },
      solveTimeMs,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/questions/history — User's question history
 */
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    // SECURITY: Cap limit to prevent large data exfiltration
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { data: questions, count } = await supabase
      .from('questions')
      .select('id, text, subject, topic, difficulty, created_at', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    res.json({
      questions: (questions || []).map((q) => ({
        id: q.id,
        extractedText: q.text?.substring(0, 100),
        subject: q.subject,
        topic: q.topic,
        createdAt: q.created_at,
      })),
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/questions/:id — Get question + solution
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { data: question } = await supabase
      .from('questions')
      .select('*, solutions(*)')
      .eq('id', req.params.id)
      .single();

    if (!question) return res.status(404).json({ error: 'Question not found' });
    if (question.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    res.json({
      id: question.id,
      extractedText: question.text,
      subject: question.subject,
      topic: question.topic,
      solution: question.solutions?.[0] || null,
      createdAt: question.created_at,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/questions/:id/learn — Submit Learn Mode response
 */
router.post('/:id/learn', authenticate, async (req, res, next) => {
  try {
    const { data: question } = await supabase
      .from('questions')
      .select('*, solutions(*)')
      .eq('id', req.params.id)
      .single();

    if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND');
    if (question.user_id !== req.user.id) throw new AppError('Access denied', 403, 'FORBIDDEN');

    const { response } = req.body;
    if (!response || response.length < 10) {
      throw new AppError('Please provide a detailed explanation (min 10 characters)', 400, 'VALIDATION_ERROR');
    }

    const solution = question.solutions?.[0];
    const evaluation = await evaluateLearnMode({
      question: question.text,
      solution: {
        steps: solution?.steps || [],
        finalAnswer: solution?.final_answer,
      },
      studentResponse: response,
    });

    // Save learn mode attempt
    await supabase.from('learn_mode_attempts').insert({
      user_id: req.user.id,
      question_id: question.id,
      student_response: response,
      score: evaluation.score,
      passed: evaluation.passed,
      feedback: evaluation.feedback,
    });

    res.json({
      score: evaluation.score,
      passed: evaluation.passed,
      feedback: evaluation.feedback,
      finalAnswer: evaluation.passed ? solution?.final_answer : undefined,
      hint: !evaluation.passed ? evaluation.hint : undefined,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
