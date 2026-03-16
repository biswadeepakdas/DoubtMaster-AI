import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Payment Service — Razorpay (India) + Stripe (International)
 */

// Plan definitions
export const PLANS = {
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Pro (Topper)',
    price: 49,
    currency: 'INR',
    interval: 'monthly',
    features: ['Unlimited solves', 'Learn Mode', 'Offline packs', 'Mock tests', 'No ads', 'Priority AI'],
    razorpayPlanId: null, // Set after Razorpay plan creation
    stripePriceId: null,
  },
  pro_annual: {
    id: 'pro_annual',
    name: 'Pro Annual (Topper)',
    price: 399,
    currency: 'INR',
    interval: 'yearly',
    features: ['Everything in Pro Monthly', 'Save ₹189/year'],
    razorpayPlanId: null,
    stripePriceId: null,
  },
  champion_monthly: {
    id: 'champion_monthly',
    name: 'Pro+ (Champion)',
    price: 99,
    currency: 'INR',
    interval: 'monthly',
    features: ['Everything in Pro', 'Live doubt chat', 'Personalized study plan', 'Parent reports', 'AR scanner'],
    razorpayPlanId: null,
    stripePriceId: null,
  },
  champion_annual: {
    id: 'champion_annual',
    name: 'Pro+ Annual (Champion)',
    price: 799,
    currency: 'INR',
    interval: 'yearly',
    features: ['Everything in Champion Monthly', 'Save ₹389/year'],
    razorpayPlanId: null,
    stripePriceId: null,
  },
};

/**
 * Create Razorpay subscription
 */
export async function createRazorpaySubscription(userId, planId) {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Invalid plan: ${planId}`);

  // In production: use Razorpay SDK
  // const razorpay = new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret });
  // const subscription = await razorpay.subscriptions.create({
  //   plan_id: plan.razorpayPlanId,
  //   customer_notify: 1,
  //   total_count: plan.interval === 'monthly' ? 12 : 1,
  // });

  const subscriptionId = `sub_demo_${Date.now()}`;
  logger.info(`Created Razorpay subscription ${subscriptionId} for user ${userId}, plan ${planId}`);

  return {
    subscriptionId,
    planId,
    amount: plan.price,
    currency: plan.currency,
    razorpayKeyId: config.razorpay.keyId,
    // Client uses this to open Razorpay checkout
    checkoutOptions: {
      key: config.razorpay.keyId,
      subscription_id: subscriptionId,
      name: 'DoubtMaster AI',
      description: plan.name,
      prefill: {},
      theme: { color: '#6366F1' },
    },
  };
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyRazorpayWebhook(body, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpay.webhookSecret || '')
    .update(JSON.stringify(body))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature || ''),
    Buffer.from(expectedSignature)
  );
}

/**
 * Handle Razorpay webhook events
 */
export async function handleRazorpayWebhook(event) {
  const { event: eventType, payload } = event;

  switch (eventType) {
    case 'subscription.activated':
      logger.info('Subscription activated:', payload.subscription.entity.id);
      // Update user plan in DB
      return { action: 'activate', subscriptionId: payload.subscription.entity.id };

    case 'subscription.charged':
      logger.info('Subscription charged:', payload.subscription.entity.id);
      // Record payment
      return { action: 'charged', subscriptionId: payload.subscription.entity.id };

    case 'subscription.cancelled':
      logger.info('Subscription cancelled:', payload.subscription.entity.id);
      // Downgrade user to free
      return { action: 'cancel', subscriptionId: payload.subscription.entity.id };

    case 'payment.failed':
      logger.warn('Payment failed:', payload.payment.entity.id);
      // Notify user
      return { action: 'payment_failed', paymentId: payload.payment.entity.id };

    default:
      logger.info(`Unhandled webhook event: ${eventType}`);
      return { action: 'ignored' };
  }
}

/**
 * Get all available plans
 */
export function getPlans() {
  return Object.values(PLANS).map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    features: plan.features,
    priceDisplay: `₹${plan.price}/${plan.interval === 'monthly' ? 'mo' : 'yr'}`,
  }));
}
