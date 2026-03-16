import { Router } from 'express';
import express from 'express';
import { handleRazorpayWebhook, verifyRazorpayWebhook } from '../services/payment.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Raw body parser for webhook signature verification
router.use(express.raw({ type: 'application/json' }));

/**
 * POST /api/webhooks/razorpay
 * Handle Razorpay payment/subscription webhooks
 */
router.post('/razorpay', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.parse(req.body.toString());

    // Verify webhook signature
    const isValid = verifyRazorpayWebhook(body, signature);
    if (!isValid) {
      logger.warn('Invalid Razorpay webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const result = await handleRazorpayWebhook(body);
    logger.info('Webhook processed:', result);

    res.json({ status: 'ok', ...result });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhooks
 */
router.post('/stripe', async (req, res) => {
  try {
    // In production: verify Stripe signature
    // const sig = req.headers['stripe-signature'];
    // const event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);

    logger.info('Stripe webhook received');
    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

export default router;
