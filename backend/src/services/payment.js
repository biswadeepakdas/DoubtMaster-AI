import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import config from '../config/index.js';
import supabase from '../db/supabase.js';

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

  const sigBuffer = Buffer.from(signature || '');
  const expectedBuffer = Buffer.from(expectedSignature);

  // timingSafeEqual throws if lengths differ — guard against that
  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Handle Razorpay webhook events — updates DB for subscription lifecycle
 */
export async function handleRazorpayWebhook(event) {
  const { event: eventType, payload } = event;

  switch (eventType) {
    case 'subscription.activated': {
      const sub = payload.subscription.entity;
      logger.info('Subscription activated:', sub.id);

      // Determine plan from notes or default to 'pro'
      const planId = sub.notes?.plan_id || 'pro_monthly';
      const plan = PLANS[planId];
      const planType = planId.startsWith('champion') ? 'champion' : 'pro';
      const billingCycle = plan?.interval === 'yearly' ? 'annual' : 'monthly';

      // Upsert into subscriptions table
      const { error: subErr } = await supabase.from('subscriptions').upsert({
        user_id: sub.notes?.user_id,
        plan: planType,
        billing_cycle: billingCycle,
        amount_inr: plan?.price || 49,
        razorpay_subscription_id: sub.id,
        status: 'active',
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (billingCycle === 'annual' ? 365 : 30) * 24 * 3600 * 1000).toISOString(),
      }, { onConflict: 'razorpay_subscription_id' });

      if (subErr) logger.error(`Failed to upsert subscription: ${subErr.message}`);

      // Update user plan
      if (sub.notes?.user_id) {
        const { error: userErr } = await supabase
          .from('users')
          .update({ plan: planType })
          .eq('id', sub.notes.user_id);
        if (userErr) logger.error(`Failed to update user plan: ${userErr.message}`);
      }

      return { action: 'activate', subscriptionId: sub.id };
    }

    case 'subscription.charged': {
      const sub = payload.subscription.entity;
      logger.info('Subscription charged:', sub.id);

      // Update subscription payment reference
      const { error: chargeErr } = await supabase
        .from('subscriptions')
        .update({
          razorpay_payment_id: payload.payment?.entity?.id || null,
          status: 'active',
        })
        .eq('razorpay_subscription_id', sub.id);

      if (chargeErr) logger.error(`Failed to update subscription charge: ${chargeErr.message}`);

      return { action: 'charged', subscriptionId: sub.id };
    }

    case 'subscription.cancelled': {
      const sub = payload.subscription.entity;
      logger.info('Subscription cancelled:', sub.id);

      // Update subscription status
      const { error: cancelErr } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('razorpay_subscription_id', sub.id);

      if (cancelErr) logger.error(`Failed to update subscription cancellation: ${cancelErr.message}`);

      // Downgrade user to free
      if (sub.notes?.user_id) {
        const { error: userErr } = await supabase
          .from('users')
          .update({ plan: 'free' })
          .eq('id', sub.notes.user_id);
        if (userErr) logger.error(`Failed to downgrade user plan: ${userErr.message}`);
      }

      return { action: 'cancel', subscriptionId: sub.id };
    }

    case 'payment.failed': {
      const payment = payload.payment.entity;
      logger.warn('Payment failed:', payment.id);

      // Update subscription to past_due if there's a linked subscription
      if (payment.subscription_id) {
        const { error: failErr } = await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('razorpay_subscription_id', payment.subscription_id);

        if (failErr) logger.error(`Failed to update subscription to past_due: ${failErr.message}`);
      }

      return { action: 'payment_failed', paymentId: payment.id };
    }

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
