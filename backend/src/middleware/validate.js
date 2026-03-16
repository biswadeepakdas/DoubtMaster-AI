import { z } from 'zod';
import { AppError } from './error.js';

/**
 * Validate request body/query/params against a Zod schema
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new AppError(`Validation failed: ${errors[0].message}`, 400, 'VALIDATION_ERROR');
    }
    req.validated = result.data;
    next();
  };
}

// Common validation schemas
export const schemas = {
  register: z.object({
    phone: z.string().regex(/^\+91\d{10}$/, 'Invalid Indian phone number').optional(),
    email: z.string().email('Invalid email').optional(),
    name: z.string().min(2).max(100),
    class: z.number().int().min(6).max(12),
    board: z.enum(['CBSE', 'ICSE', 'STATE_MH', 'STATE_KA', 'STATE_TN', 'STATE_UP', 'STATE_OTHER']),
    language: z.enum(['en', 'hi', 'ta', 'te', 'kn', 'bn', 'mr', 'gu', 'ml', 'pa', 'od']).default('en'),
  }).refine((data) => data.phone || data.email, {
    message: 'Either phone or email is required',
  }),

  solveQuestion: z.object({
    subject: z.enum(['math', 'physics', 'chemistry', 'biology', 'english', 'hindi', 'social_science']).optional(),
    class: z.number().int().min(6).max(12).optional(),
    board: z.string().optional(),
    language: z.string().default('en'),
    textQuestion: z.string().max(2000).optional(),
  }),

  learnModeResponse: z.object({
    response: z.string().min(10).max(2000),
    solutionId: z.string().uuid(),
  }),

  updateProfile: z.object({
    name: z.string().min(2).max(100).optional(),
    class: z.number().int().min(6).max(12).optional(),
    board: z.string().optional(),
    language: z.string().optional(),
    targetExam: z.enum(['NONE', 'JEE_MAIN', 'JEE_ADVANCED', 'NEET', 'BOARDS']).optional(),
    schoolName: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
  }),

  createSubscription: z.object({
    planId: z.enum(['pro_monthly', 'pro_annual', 'champion_monthly', 'champion_annual']),
    paymentMethod: z.enum(['razorpay', 'stripe']).default('razorpay'),
  }),
};
