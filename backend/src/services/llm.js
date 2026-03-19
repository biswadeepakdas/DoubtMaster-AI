import OpenAI from 'openai';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * LLM Service — Multi-model support
 *
 * Model Routing (tested latency):
 *   - Groq Llama 3.3 70B   → PRIMARY solver, all subjects (~1-3s, FREE)
 *   - sarvamai/sarvam-m     → Indian languages via NVIDIA NIM (~3-5s)
 *   - qwen/qwq-32b          → Hard math fallback via NVIDIA NIM (~15-25s, reasoning)
 *   - google/gemma-3-27b-it  → Vision/OCR only via NVIDIA NIM
 */

const NVIDIA_BASE_URL = config.ai.nvidia.baseUrl;

// Model constants
const GROQ_MODEL = config.ai.groq.model;            // llama-3.3-70b-versatile
const SARVAM_MODEL = config.ai.nvidia.model;         // sarvamai/sarvam-m
const QWQ_MODEL = config.ai.qwq.model;               // qwen/qwq-32b
const GEMMA_MODEL = config.ai.gemma.model;            // google/gemma-3-27b-it

// Lazy-initialized clients
const _clients = {};

function getGroqClient() {
  if (!_clients.groq) {
    const apiKey = config.ai.groq.apiKey;
    if (!apiKey) throw new Error('GROQ_API_KEY is not configured. Set it in environment variables.');
    _clients.groq = new OpenAI({ baseURL: config.ai.groq.baseUrl, apiKey, timeout: 30000 });
  }
  return _clients.groq;
}

function getSarvamClient() {
  if (!_clients.sarvam) {
    const apiKey = config.ai.nvidia.apiKey;
    if (!apiKey) throw new Error('NVIDIA_API_KEY is not configured. Set it in environment variables.');
    _clients.sarvam = new OpenAI({ baseURL: NVIDIA_BASE_URL, apiKey, timeout: 120000 });
  }
  return _clients.sarvam;
}

function getQwqClient() {
  if (!_clients.qwq) {
    const apiKey = config.ai.qwq.apiKey;
    if (!apiKey) throw new Error('QWQ_NIM_API_KEY is not configured. Set it in environment variables.');
    _clients.qwq = new OpenAI({ baseURL: NVIDIA_BASE_URL, apiKey, timeout: 120000 });
  }
  return _clients.qwq;
}

function getGemmaClient() {
  if (!_clients.gemma) {
    const apiKey = config.ai.gemma.apiKey;
    if (!apiKey) throw new Error('GEMMA_API_KEY is not configured. Set it in environment variables.');
    _clients.gemma = new OpenAI({ baseURL: NVIDIA_BASE_URL, apiKey, timeout: 120000 });
  }
  return _clients.gemma;
}

/**
 * Get the right client for a given model
 */
function getClient(model) {
  if (model === GROQ_MODEL) return getGroqClient();
  if (model === GEMMA_MODEL) return getGemmaClient();
  if (model === QWQ_MODEL) return getQwqClient();
  if (model === SARVAM_MODEL) return getSarvamClient();
  // Default to Groq (fastest)
  return getGroqClient();
}

/**
 * Call the LLM with a system prompt and user message.
 * Returns the assistant's text response.
 */
export async function callLLM({ systemPrompt, userPrompt, model, temperature = 0.5, maxTokens = 16384, topP = 1 }) {
  const selectedModel = model || GROQ_MODEL;
  const client = getClient(selectedModel);

  logger.info(`LLM call: model=${selectedModel}, prompt length=${userPrompt.length}`);

  const response = await client.chat.completions.create({
    model: selectedModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    top_p: topP,
    max_tokens: maxTokens,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error('Empty response from LLM');

  logger.info(`LLM response: ${text.length} chars, finish_reason=${response.choices[0]?.finish_reason}`);
  return text;
}

/**
 * Call the LLM and parse the response as JSON.
 * Handles markdown code fences that models sometimes wrap JSON in.
 */
export async function callLLMJson({ systemPrompt, userPrompt, model, temperature = 0.3, maxTokens = 16384 }) {
  const raw = await callLLM({ systemPrompt, userPrompt, model, temperature, maxTokens });

  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // Strip any leading/trailing non-JSON text before/after the outermost braces
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Fall through to further extraction attempts
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    logger.warn(`Failed to parse LLM JSON response, attempting nested extraction. Error: ${err.message}`);
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerErr) {
        logger.warn(`Nested JSON extraction also failed: ${innerErr.message}`);
      }
    }
    throw new Error(`LLM returned invalid JSON: ${cleaned.substring(0, 300)}`);
  }
}

/**
 * Call Gemma 3 27B with a vision/multimodal message (image + text).
 * Used for OCR — extracting questions from homework photos.
 */
export async function callVision({ imageBase64, prompt, mimeType = 'image/jpeg', maxTokens = 4096 }) {
  logger.info(`Vision call: Gemma 3 27B, image size=${imageBase64.length} chars`);

  const client = getGemmaClient();
  const response = await client.chat.completions.create({
    model: GEMMA_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ],
    temperature: 0.2,
    top_p: 0.7,
    max_tokens: maxTokens,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error('Empty vision response from Gemma');

  logger.info(`Vision response: ${text.length} chars`);
  return text;
}

/**
 * Stream LLM response for real-time UI updates.
 */
export async function* streamLLM({ systemPrompt, userPrompt, model, temperature = 0.5, maxTokens = 16384 }) {
  const selectedModel = model || GROQ_MODEL;
  const client = getClient(selectedModel);

  const stream = await client.chat.completions.create({
    model: selectedModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    top_p: 1,
    max_tokens: maxTokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

/** Expose model constants for routing */
export const MODELS = {
  GROQ: GROQ_MODEL,
  SARVAM: SARVAM_MODEL,
  QWQ: QWQ_MODEL,
  GEMMA: GEMMA_MODEL,
};
