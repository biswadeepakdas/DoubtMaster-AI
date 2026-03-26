import OpenAI from 'openai';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * LLM Service — All models via NVIDIA NIM (single API key)
 *
 * Model Routing:
 *   - deepseek-ai/deepseek-r1-0528   → PRIMARY solver, best at math/reasoning (~5-15s)
 *   - nvidia/nemotron-3-super-120b    → General solver fallback (~3-8s)
 *   - sarvamai/sarvam-m               → Indian languages (Tamil, Telugu, Odia, etc.)
 *   - qwen/qwq-32b                    → Hard math reasoning fallback
 *   - nvidia/nemotron-nano-12b-v2-vl  → Vision/OCR (reads images, handwriting)
 *   - google/gemma-3-27b-it           → Vision/OCR fallback
 */

const NVIDIA_BASE_URL = config.ai.nvidia.baseUrl;

// All models accessed via single NVIDIA NIM API key
const DEEPSEEK_MODEL = 'deepseek-ai/deepseek-r1-0528';
const NEMOTRON_MODEL = 'nvidia/nemotron-3-super-120b-a12b';
const SARVAM_MODEL = config.ai.nvidia.model;           // sarvamai/sarvam-m
const QWQ_MODEL = config.ai.qwq.model;                  // qwen/qwq-32b
const NEMOTRON_VL_MODEL = 'nvidia/nemotron-nano-12b-v2-vl';
const GEMMA_MODEL = config.ai.gemma.model;               // google/gemma-3-27b-it

// Legacy model constant for Groq (kept for backward compat in solver.js routing)
const GROQ_MODEL = config.ai.groq.model;                // llama-3.3-70b-versatile

// Single NVIDIA NIM client — one API key for everything
let _nimClient = null;

function getNimClient() {
  if (!_nimClient) {
    const apiKey = config.ai.nvidia.apiKey;
    if (!apiKey) throw new Error('NVIDIA_API_KEY is not configured. Get a free key at https://build.nvidia.com/settings/api-keys');
    _nimClient = new OpenAI({ baseURL: NVIDIA_BASE_URL, apiKey, timeout: 120000 });
  }
  return _nimClient;
}

// Groq client (optional — used only if GROQ_API_KEY is set)
let _groqClient = null;

function getGroqClient() {
  if (!_groqClient) {
    const apiKey = config.ai.groq.apiKey;
    if (!apiKey) return null; // Not configured — fall through to NVIDIA
    _groqClient = new OpenAI({ baseURL: config.ai.groq.baseUrl, apiKey, timeout: 30000 });
  }
  return _groqClient;
}

/**
 * Get the right client for a given model.
 * Groq models use Groq client (if available), everything else uses NVIDIA NIM.
 */
function getClient(model) {
  if (model === GROQ_MODEL) {
    const groq = getGroqClient();
    if (groq) return groq;
    // Groq not configured — use DeepSeek on NVIDIA NIM instead
    logger.info('Groq not configured, routing to DeepSeek-R1 on NVIDIA NIM');
    return getNimClient();
  }
  return getNimClient();
}

/**
 * Resolve the actual model ID to use.
 * If Groq is requested but not configured, swap to DeepSeek-R1.
 */
function resolveModel(model) {
  if (model === GROQ_MODEL && !config.ai.groq.apiKey) {
    return DEEPSEEK_MODEL;
  }
  return model;
}

/**
 * Call the LLM with a system prompt and user message.
 * Returns the assistant's text response.
 */
export async function callLLM({ systemPrompt, userPrompt, model, temperature = 0.5, maxTokens = 16384, topP = 1 }) {
  const selectedModel = resolveModel(model || GROQ_MODEL);
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
 * Handles markdown code fences and <think> blocks that reasoning models wrap output in.
 */
export async function callLLMJson({ systemPrompt, userPrompt, model, temperature = 0.3, maxTokens = 16384 }) {
  const raw = await callLLM({ systemPrompt, userPrompt, model, temperature, maxTokens });

  // Strip markdown code fences if present
  let cleaned = raw.trim();

  // DeepSeek-R1 wraps reasoning in <think>...</think> blocks — strip them
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

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
 * Call a vision model with image + text.
 * Primary: Nemotron VL (NVIDIA NIM). Fallback: Gemma 3 27B.
 */
export async function callVision({ imageBase64, prompt, mimeType = 'image/jpeg', maxTokens = 4096, model }) {
  const visionModel = model === 'fallback' ? GEMMA_MODEL : NEMOTRON_VL_MODEL;
  logger.info(`Vision call: ${visionModel}, image size=${imageBase64.length} chars`);

  const client = getNimClient();
  const response = await client.chat.completions.create({
    model: visionModel,
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
  if (!text) throw new Error(`Empty vision response from ${visionModel}`);

  logger.info(`Vision response: ${text.length} chars`);
  return text;
}

/**
 * Stream LLM response for real-time UI updates.
 */
export async function* streamLLM({ systemPrompt, userPrompt, model, temperature = 0.5, maxTokens = 16384 }) {
  const selectedModel = resolveModel(model || GROQ_MODEL);
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
  GROQ: GROQ_MODEL,       // Will auto-resolve to DeepSeek if Groq not configured
  DEEPSEEK: DEEPSEEK_MODEL,
  NEMOTRON: NEMOTRON_MODEL,
  SARVAM: SARVAM_MODEL,
  QWQ: QWQ_MODEL,
  GEMMA: GEMMA_MODEL,
  NEMOTRON_VL: NEMOTRON_VL_MODEL,
};
