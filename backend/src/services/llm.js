import OpenAI from 'openai';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * LLM Service — Multi-model support via NVIDIA NIM (OpenAI-compatible API)
 *
 * Models:
 *   - sarvamai/sarvam-m  → Indian multilingual solver (Hindi, Tamil, Telugu, etc.)
 *   - google/gemma-3-27b-it → Vision/OCR + English fallback solver
 */

const NVIDIA_BASE_URL = config.ai.nvidia.baseUrl;
const SARVAM_MODEL = config.ai.nvidia.model;
const GEMMA_MODEL = config.ai.gemma.model;

// Lazy-initialized clients — avoid crash at import time if keys are missing
let _sarvamClient = null;
let _gemmaClient = null;

function getSarvamClient() {
  if (!_sarvamClient) {
    const apiKey = config.ai.nvidia.apiKey;
    if (!apiKey) throw new Error('NVIDIA_API_KEY is not configured. Set it in environment variables.');
    _sarvamClient = new OpenAI({ baseURL: NVIDIA_BASE_URL, apiKey, timeout: 120000 });
  }
  return _sarvamClient;
}

function getGemmaClient() {
  if (!_gemmaClient) {
    const apiKey = config.ai.gemma.apiKey;
    if (!apiKey) throw new Error('GEMMA_API_KEY is not configured. Set it in environment variables.');
    _gemmaClient = new OpenAI({ baseURL: NVIDIA_BASE_URL, apiKey, timeout: 120000 });
  }
  return _gemmaClient;
}

/**
 * Get the right client for a given model
 */
function getClient(model) {
  if (model === GEMMA_MODEL) return getGemmaClient();
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

  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    logger.warn(`Failed to parse LLM JSON response, attempting extraction. Error: ${err.message}`);
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`LLM returned invalid JSON: ${cleaned.substring(0, 200)}`);
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
export const MODELS = { SARVAM: SARVAM_MODEL, GEMMA: GEMMA_MODEL };
