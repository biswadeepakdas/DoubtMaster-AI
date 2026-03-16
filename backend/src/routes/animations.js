import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { AnimatorAgent } from '../agents/animator.js';
import { AppError } from '../middleware/error.js';

const router = Router();
const animator = new AnimatorAgent(null); // LLM service injected in production

// In-memory animation store
const animations = new Map();

/**
 * POST /api/animations/generate
 * Request an animation for a specific question
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

    animations.set(animation.animation_id, animation);

    res.status(201).json(animation);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/animations/explain
 * Free-form: "Explain [concept]" → generate animation
 */
router.post('/explain', authenticate, async (req, res, next) => {
  try {
    const { concept, subject, grade } = req.body;
    if (!concept) throw new AppError('Concept is required', 400, 'VALIDATION_ERROR');

    const animation = await animator.generateAnimation({
      questionId: null,
      concept,
      subject: subject || detectSubject(concept),
      grade: grade || 10,
      language: req.user.language || 'en',
    });

    animations.set(animation.animation_id, animation);
    res.status(201).json(animation);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/animations/:id/status
 * Check animation generation status
 */
router.get('/:id/status', authenticate, (req, res) => {
  const animation = animations.get(req.params.id);
  if (!animation) return res.status(404).json({ error: 'Animation not found' });

  res.json({
    animation_id: animation.animation_id,
    status: animation.status,
    progress: animation.status === 'complete' ? 100 : 50,
    video_url: animation.video_url,
  });
});

/**
 * GET /api/animations/:id/video
 * Get animation video URL
 */
router.get('/:id/video', (req, res) => {
  const animation = animations.get(req.params.id);
  if (!animation) return res.status(404).json({ error: 'Animation not found' });
  if (animation.status !== 'complete') return res.status(202).json({ message: 'Still generating' });

  // In production: redirect to CDN URL or stream video
  res.json({
    video_url: animation.video_url,
    duration_seconds: animation.duration_seconds,
    thumbnail_url: animation.thumbnail_url,
    subtitles: animation.subtitles,
  });
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
