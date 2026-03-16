import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// In-memory store (replace with DB)
const ratings = new Map();

/**
 * GET /api/solutions/:id
 * Get full solution by ID
 */
router.get('/:id', authenticate, (req, res) => {
  // In production: fetch from DB
  res.json({
    message: 'Solution endpoint - connect to database',
    solutionId: req.params.id,
  });
});

/**
 * GET /api/solutions/:id/steps
 * Get paginated steps (for Learn Mode progressive reveal)
 */
router.get('/:id/steps', authenticate, (req, res) => {
  const { reveal = 3 } = req.query; // Show first N steps
  res.json({
    solutionId: req.params.id,
    revealedSteps: parseInt(reveal, 10),
    message: 'Submit Learn Mode response to reveal more steps',
  });
});

/**
 * POST /api/solutions/:id/rate
 * Rate solution quality (1-5 stars + optional feedback)
 */
router.post('/:id/rate', authenticate, (req, res) => {
  const { rating, feedback } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be 1-5' });
  }

  ratings.set(`${req.params.id}_${req.user.id}`, {
    rating,
    feedback: feedback || '',
    createdAt: new Date().toISOString(),
  });

  res.json({ message: 'Thank you for your feedback!', rating });
});

export default router;
