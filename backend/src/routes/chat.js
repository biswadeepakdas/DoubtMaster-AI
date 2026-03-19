import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { callLLM } from '../services/llm.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/v1/chat/followup — Streaming follow-up chat on solutions
 *
 * Lightweight chat agent: takes conversation history + solution context,
 * returns a streamed response for real-time display.
 */
router.post('/followup', authenticate, async (req, res, next) => {
  try {
    const { systemPrompt, messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new AppError('Messages array is required', 400, 'VALIDATION_ERROR');
    }

    // Limit conversation length to prevent token abuse
    const recentMessages = messages.slice(-10);
    const lastUserMsg = recentMessages.filter(m => m.role === 'user').pop();
    if (!lastUserMsg) {
      throw new AppError('At least one user message is required', 400, 'VALIDATION_ERROR');
    }

    // Build the prompt with conversation history
    const conversationText = recentMessages
      .map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
      .join('\n\n');

    const fullPrompt = `${conversationText}\n\nTutor:`;

    logger.info(`Chat followup: user=${req.user.id}, messages=${recentMessages.length}`);

    // Get response from LLM (non-streaming for simplicity + reliability)
    const response = await callLLM({
      systemPrompt: systemPrompt || 'You are a helpful tutor for Indian students. Be concise and encouraging.',
      userPrompt: fullPrompt,
      temperature: 0.5,
      maxTokens: 1000,
    });

    // Send as SSE stream (simulated — sends full response in chunks for smooth UI)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Split response into chunks for streaming effect
    const words = response.split(' ');
    const chunkSize = 3; // Send 3 words at a time

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '');
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    // If headers already sent (streaming started), end the stream
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      next(error);
    }
  }
});

export default router;
