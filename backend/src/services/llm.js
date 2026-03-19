import OpenAI from 'openai';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * LLM Service — Multi-model support via NVIDIA NIM (OpenAI-compatible API)
 *
 * Model Routing:
 *   - sarvamai/sarvam-m       → Indian languages (Hindi, Odia, Kannada, etc.)
 *   - google/gemma-3-27b-it   → Vision/OCR (image → text extraction)
 *   - deepseek-ai/deepseek-v3-2  → Hard math, JEE/NEET, reasoning (87.5% AIME)
 *   - qwen/qwq-32b            → Math reasoning backup, step-by-step
 *   - qwen/qwen3.5-122b-a10b  → All-subjects workhorse (122B params)
 */

const NVIDIA_BASE_URL = config.ai.nvidia.baseUrl;

// Model constants
const SARVAM_MODEL = config.ai.nvidia.model;       // sarvamai/sarvam-m
const GEMMA_MODEL = config.ai.gemma.model;          // google/gemma-3-27b-it
const DEEPSEEK_MODEL = config.ai.deepseek.model;    // deepseek-ai/deepseek-v3-2
const QWQ_MODEL = config.ai.qwq.model;              // qwen/qwq-32b
const QWEN_MODEL = config.ai.qwen.model;            // qwen/qwen3.5-122b-a10b

// Lazy-initialized clients — avoid crash at import time if keys are missing
const _clients = {};

function getClientFor(name, apiKeyGetter) {
  if (!_clients[name]) {
    const apiKey = apiKeyGetter();
    if (!apiKey) throw new Error(`${name} API key is not configured. Set it in environment variables.`);
    _clients[name] = new OpenAI({ baseURL: NVIDIA_BASE_URL, apiKey, timeout: 120000 });
  }
  return _clients[name];
}

function getSarvamClient() { return getClientFor('sarvam', () => config.ai.nvidia.apiKey); }
function getGemmaClient() { return getClientFor('gemma', () => config.ai.gemma.apiKey); }
function getDeepSeekClient() { return getClientFor('deepseek', () => config.ai.deepseek.apiKey); }
function getQwqClient() { return getClientFor('qwq', () => config.ai.qwq.apiKey); }
function getQwenClient() { return getClientFor('qwen', () => config.ai.qwen.apiKey); }

/**
 * Get the right client for a given model
 */
function getClient(model) {
  if (model === GEMMA_MODEL) return getGemmaClient();
  if (model === DEEPSEEK_MODEL) return getDeepSeekClient();
  if (model === QWQ_MODEL) return getQwqClient();
  if (model === QWEN_MODEL) return getQwenClient();
  return getSarvamClient();
}

/**
 * Call the LLM with a system prompt and user message.
 * Returns the assistant's text response.
 */
export async function callLLM({ systemPrompt, userPrompt, model, temperature = 0.5, maxTokens = 16384, topP = 1 }) {
  const selectedModel = model || SARVAM_MODEL;
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

  // Strip markdown code fences if present (handles ```json, ```, ```JSON, etc.)
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
 * Yields text chunks as they arrive.
 */
export async function* streamLLM({ systemPrompt, userPrompt, model, temperature = 0.5, maxTokens = 16384 }) {
  const selectedModel = model || SARVAM_MODEL;
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
  SARVAM: SARVAM_MODEL,
  GEMMA: GEMMA_MODEL,
  DEEPSEEK: DEEPSEEK_MODEL,
  QWQ: QWQ_MODEL,
  QWEN: QWEN_MODEL,
};
