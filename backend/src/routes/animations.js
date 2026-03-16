import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { AnimatorAgent } from '../agents/animator.js';
import { AppError } from '../middleware/error.js';
import supabase from '../db/supabase.js';

const router = Router();
const animator = new AnimatorAgent(null);

/**
 * POST /api/animations/generate
 */
router.post('/generate', authenticate, async (req, res, next) => {
  try {
    const { questionId, concept, subject, grade } = req.body;
    if (!concept) throw new AppError('Concept is required', 400, 'VALIDATION_ERROR');

    const animation = await animator.generateAnimation({
      questionId,
      concept,
      subject: subject || 'math',
      grade: grade || 10,
      language: req.user.language || 'en',
    });

    // Save to DB
    const { data: saved } = await supabase.from('animations').insert({
      id: animation.animation_id,
      question_id: questionId || null,
      user_id: req.user.id,
      concept,
      subject: subject || 'math',
      grade: grade || 10,
      status: animation.status,
      video_url: animation.video_url,
      thumbnail_url: animation.thumbnail_url,
      duration_seconds: animation.duration_seconds,
      animation_type: animation.animation_type || 'manim',
      manim_code: animation.manim_code,
    }).select().single();

    res.status(201).json(saved || animation);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/animations/explain
 */
router.post('/explain', authenticate, async (req, res, next) => {
  try {
    const { concept, subject, grade } = req.body;
    if (!concept) throw new AppError('Concept is required', 400, 'VALIDATION_ERROR');

    const detectedSubject = subject || detectSubject(concept);
    const animation = await animator.generateAnimation({
      questionId: null,
      concept,
      subject: detectedSubject,
      grade: grade || 10,
      language: req.user.language || 'en',
    });

    await supabase.from('animations').insert({
      id: animation.animation_id,
      user_id: req.user.id,
      concept,
      subject: detectedSubject,
      grade: grade || 10,
      status: animation.status,
      video_url: animation.video_url,
      animation_type: animation.animation_type || 'manim',
      manim_code: animation.manim_code,
    });

    res.status(201).json(animation);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/animations/:id/status
 */
router.get('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { data: animation } = await supabase.from('animations')
      .select('id, status, video_url')
      .eq('id', req.params.id)
      .single();

    if (!animation) return res.status(404).json({ error: 'Animation not found' });

    res.json({
      animation_id: animation.id,
      status: animation.status,
      progress: animation.status === 'complete' ? 100 : 50,
      video_url: animation.video_url,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/animations/:id/video
 */
router.get('/:id/video', async (req, res, next) => {
  try {
    const { data: animation } = await supabase.from('animations')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!animation) return res.status(404).json({ error: 'Animation not found' });
    if (animation.status !== 'complete') return res.status(202).json({ message: 'Still generating' });

    res.json({
      video_url: animation.video_url,
      duration_seconds: animation.duration_seconds,
      thumbnail_url: animation.thumbnail_url,
    });
  } catch (error) {
    next(error);
  }
});

function detectSubject(concept) {
  const lower = concept.toLowerCase();
  if (/equation|algebra|geometry|calculus|trigonometry|matrix|polynomial/.test(lower)) return 'math';
  if (/force|velocity|energy|circuit|optics|wave/.test(lower)) return 'physics';
  if (/element|reaction|bond|acid|organic/.test(lower)) return 'chemistry';
  if (/cell|dna|photosynthesis|evolution|anatomy/.test(lower)) return 'biology';
  return 'math';
}

export default router;
