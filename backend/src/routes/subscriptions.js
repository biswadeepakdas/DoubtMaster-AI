import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';
import { getPlans, createRazorpaySubscription } from '../services/payment.js';

const router = Router();

/**
 * GET /api/subscriptions/plans
 * List all available plans
 */
router.get('/plans', (req, res) => {
  res.json({ plans: getPlans() });
});

/**
 * POST /api/subscriptions/create
 * Create a new subscription (Razorpay/Stripe)
 */
router.post('/create', authenticate, validate(schemas.createSubscription), async (req, res, next) => {
  try {
    const { planId, paymentMethod } = req.validated;

    if (paymentMethod === 'razorpay') {
      const subscription = await createRazorpaySubscription(req.user.id, planId);
      return res.json(subscription);
    }

    // Stripe (international)
    res.json({
      message: 'Stripe checkout session would be created here',
      planId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subscriptions/status
 * Current subscription status
 */
router.get('/status', authenticate, (req, res) => {
  res.json({
    plan: req.user.plan || 'free',
    status: 'active',
    renewsAt: req.user.plan !== 'free' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
    features: req.user.plan === 'free'
      ? ['Unlimited NCERT', '20 advanced solves/day', 'Basic progress']
      : ['Unlimited everything', 'Learn Mode', 'Offline', 'Mock tests', 'No ads'],
  });
});

export default router;
