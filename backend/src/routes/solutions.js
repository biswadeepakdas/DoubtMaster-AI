import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import supabase from '../db/supabase.js';

const router = Router();

/**
 * GET /api/solutions/:id
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { data: solution } = await supabase
      .from('solutions')
      .select('*, questions!inner(user_id, text, subject, topic)')
      .eq('id', req.params.id)
      .single();

    if (!solution) return res.status(404).json({ error: 'Solution not found' });
    if (solution.questions.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    res.json(solution);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/solutions/:id/steps — Paginated steps (for Learn Mode progressive reveal)
 */
router.get('/:id/steps', authenticate, async (req, res, next) => {
  try {
    const { reveal = 3 } = req.query;
    const revealCount = parseInt(reveal, 10);

    const { data: solution } = await supabase
      .from('solutions')
      .select('id, steps')
      .eq('id', req.params.id)
      .single();

    if (!solution) return res.status(404).json({ error: 'Solution not found' });

    const allSteps = solution.steps || [];
    res.json({
      solutionId: solution.id,
      revealedSteps: allSteps.slice(0, revealCount),
      totalSteps: allSteps.length,
      hasMore: revealCount < allSteps.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/solutions/:id/rate — Rate solution quality (1-5 stars)
 */
router.post('/:id/rate', authenticate, async (req, res, next) => {
  try {
    const { rating, feedback } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5' });
    }

    const { error } = await supabase.from('solution_ratings').upsert({
      solution_id: req.params.id,
      user_id: req.user.id,
      rating,
      feedback: feedback || '',
    }, { onConflict: 'solution_id,user_id' });

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Thank you for your feedback!', rating });
  } catch (error) {
    next(error);
  }
});

export default router;
