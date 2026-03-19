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

/**
 * Update dashboard stats after a question is solved.
 * Wrapped in try-catch so failures never block the solve response.
 */
async function updateStatsAfterSolve(userId, subject) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // 1. Check yesterday and today progress BEFORE upserting today's row
    const [{ data: yesterdayProgress }, { data: todayProgress }] = await Promise.all([
      supabase
        .from('user_progress')
        .select('questions_solved')
        .eq('user_id', userId)
        .eq('date', yesterday)
        .maybeSingle(),
      supabase
        .from('user_progress')
        .select('questions_solved, subjects_data')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle(),
    ]);

    const isFirstSolveToday = !todayProgress || todayProgress.questions_solved === 0;

    // 2. Upsert user_progress for today — increment questions_solved
    const newSolvedCount = (todayProgress?.questions_solved || 0) + 1;
    const subjectsData = todayProgress?.subjects_data || {};
    if (subject) {
      subjectsData[subject] = (subjectsData[subject] || 0) + 1;
    }

    await supabase.from('user_progress').upsert(
      {
        user_id: userId,
        date: today,
        questions_solved: newSolvedCount,
        correct_count: (todayProgress?.correct_count || 0) + 1,
        subjects_data: subjectsData,
      },
      { onConflict: 'user_id,date' }
    );

    // 3. Update users.solve_count — simple read-then-write (RPC may not exist)
    try {
      const { data: userData } = await supabase.from('users').select('solve_count').eq('id', userId).single();
      const newCount = (userData?.solve_count || 0) + 1;
      const { error: updateErr } = await supabase.from('users').update({ solve_count: newCount }).eq('id', userId);
      if (updateErr) logger.warn(`solve_count update error: ${updateErr.message}`);
      else logger.info(`solve_count updated to ${newCount} for user ${userId}`);
    } catch (e) {
      logger.warn(`Failed to increment solve_count: ${e.message}`);
    }

    // 4. Update streak if this is the first solve today
    if (isFirstSolveToday) {
      try {
        const { data: userData } = await supabase.from('users').select('streak, best_streak').eq('id', userId).single();
        let newStreak;
        if (yesterdayProgress && yesterdayProgress.questions_solved > 0) {
          // Continued streak
          newStreak = (userData?.streak || 0) + 1;
        } else {
          // New streak (broken or first day)
          newStreak = 1;
        }
        const bestStreak = Math.max(newStreak, userData?.best_streak || 0);
        await supabase.from('users').update({ streak: newStreak, best_streak: bestStreak }).eq('id', userId);
      } catch (e) {
        logger.warn(`Failed to update streak: ${e.message}`);
      }
    }
  } catch (err) {
    logger.warn(`Stats update failed (non-blocking): ${err.message}`);
  }
}

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

      // Update all dashboard stats (non-blocking — errors are caught internally)
      updateStatsAfterSolve(req.user.id, result.subject);
    }

    // Free plan: show only first 3 steps to encourage Learn Mode
    const allSteps = result.solution.steps;
    const isFree = req.user.plan === 'free';
    const visibleSteps = isFree ? allSteps.slice(0, 3) : allSteps;

    res.json({
      questionId: question?.id,
      extractedText: result.extractedText,
      subject: result.subject,
      topic: result.topic,
      confidence: result.confidence,
      solution: {
        steps: visibleSteps,
        finalAnswer: isFree ? undefined : result.solution.finalAnswer,
        learnModeRequired: isFree,
        totalSteps: allSteps.length,
        visibleSteps: visibleSteps.length,
        conceptTags: result.solution.conceptTags || [],
        alternativeMethod: result.solution.alternativeMethod || null,
        relatedPYQs: result.solution.relatedPYQs || [],
        diagram: result.solution.diagram || null,
        animation: result.solution.animation || null,
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
      const { error: sErr } = await supabase.from('solutions').insert({
        question_id: question.id,
        steps: result.solution.steps,
        final_answer: result.solution.finalAnswer || '',
        confidence: result.confidence,
        model_used: result.modelUsed,
        concept_tags: result.solution.conceptTags || [],
        from_cache: result.fromCache || false,
      });
      if (sErr) logger.error(`Failed to save solution: ${sErr.message}`);

      // Update all dashboard stats (non-blocking — errors are caught internally)
      updateStatsAfterSolve(req.user.id, result.subject);
    }

    // Free plan: show only first 3 steps to encourage Learn Mode
    const allSteps = result.solution.steps;
    const isFree = req.user.plan === 'free';
    const visibleSteps = isFree ? allSteps.slice(0, 3) : allSteps;

    res.json({
      questionId: question?.id,
      extractedText: result.extractedText,
      subject: result.subject,
      topic: result.topic,
      confidence: result.confidence,
      solution: {
        steps: visibleSteps,
        finalAnswer: isFree ? undefined : result.solution.finalAnswer,
        learnModeRequired: isFree,
        totalSteps: allSteps.length,
        visibleSteps: visibleSteps.length,
        conceptTags: result.solution.conceptTags || [],
        alternativeMethod: result.solution.alternativeMethod || null,
        relatedPYQs: result.solution.relatedPYQs || [],
        diagram: result.solution.diagram || null,
        animation: result.solution.animation || null,
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
    const { page = 1, limit = 20, search } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    // SECURITY: Cap limit to prevent large data exfiltration
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('questions')
      .select('id, text, subject, topic, difficulty, created_at', { count: 'exact' })
      .eq('user_id', req.user.id);

    // Apply text search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.ilike('text', searchTerm);
    }

    const { data: questions, count } = await query
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
