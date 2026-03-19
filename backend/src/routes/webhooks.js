import { Router } from 'express';
import express from 'express';
import Stripe from 'stripe';
import { handleRazorpayWebhook, verifyRazorpayWebhook } from '../services/payment.js';
import { logger } from '../utils/logger.js';
import config from '../config/index.js';

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

    // Ensure raw body is a Buffer or string before parsing
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf-8') : String(req.body || '');
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseErr) {
      logger.warn(`Razorpay webhook: invalid JSON body — ${parseErr.message}`);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    // Verify webhook signature using the RAW body string (not re-serialized JSON)
    // to preserve byte-exact match with what Razorpay signed
    const isValid = verifyRazorpayWebhook(rawBody, signature);
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
 * Handle Stripe webhooks with signature verification
 */
router.post('/stripe', async (req, res) => {
  try {
    if (!config.stripe.secretKey || !config.stripe.webhookSecret) {
      logger.error('Stripe keys not configured');
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripe = new Stripe(config.stripe.secretKey);
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      logger.warn('Missing Stripe webhook signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
    } catch (err) {
      logger.warn(`Stripe webhook signature verification failed: ${err.message}`);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    logger.info(`Stripe webhook received: ${event.type}`);

    // Handle relevant event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        logger.info(`Stripe subscription event: ${event.type}`, { subscriptionId: event.data.object.id });
        break;
      case 'customer.subscription.deleted':
        logger.info('Stripe subscription cancelled', { subscriptionId: event.data.object.id });
        break;
      case 'invoice.payment_failed':
        logger.warn('Stripe payment failed', { invoiceId: event.data.object.id });
        break;
      default:
        logger.info(`Unhandled Stripe event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
