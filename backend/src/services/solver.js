import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { callLLMJson, callLLM, callVision, MODELS } from './llm.js';
import { logger } from '../utils/logger.js';
import config from '../config/index.js';
import { getRedis } from '../db/redis.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let SOLVER_SYSTEM_PROMPT;
try {
  SOLVER_SYSTEM_PROMPT = readFileSync(join(__dirname, '../prompts/solver.txt'), 'utf-8');
} catch (err) {
  logger.warn(`Failed to read solver prompt file: ${err.message}. Using fallback prompt.`);
  SOLVER_SYSTEM_PROMPT = `You are an expert academic tutor for Indian students (CBSE, ICSE, State Boards, JEE, NEET).

CRITICAL RULES:
1. You MUST solve the problem completely with ACTUAL numbers, calculations, and the final numeric/symbolic answer.
2. Each step MUST show the actual mathematical work — not just describe what to do.
3. The "content" field in each step must contain the ACTUAL equation, calculation, or derivation — NOT a description like "solve for x".
4. The "finalAnswer" MUST contain the concrete answer (e.g., "x = 3, y = 7" not "the value of x and y").

EXAMPLE of GOOD step content: "2x + 6y = 108  ... (equation 1 multiplied by 2)"
EXAMPLE of BAD step content: "Multiplying equation 1 by 2 to align coefficients"

Return a valid JSON object with these keys:
- steps: array of { stepNumber: number, title: string, content: string, explanation: string, concept: string, formula: string|null }
  - "content" = the actual math work shown (equations, substitutions, simplifications)
  - "explanation" = why this step is done
- finalAnswer: string (the concrete numeric/symbolic answer)
- confidence: number between 0 and 1
- conceptTags: array of strings
- relatedPYQs: array of strings (optional)
- alternativeMethod: string or null`;
}

/**
 * AI Question Solver Service
 * Multi-model pipeline: Image → OCR → Classification → LLM Solve → Steps Generation
 */

// Solution cache TTL in seconds (default 72 hours)
const CACHE_TTL_SECONDS = (config.app.solutionCacheTTLHours || 72) * 3600;

/**
 * Main solve pipeline
 */
export async function solveQuestion({ id, userId, image, textQuestion, subject, class: grade, board, language, userPlan }) {
  const questionText = textQuestion || await extractTextFromImage(image);
  const sanitizedText = sanitizePromptInput(questionText);
  const cacheKey = generateCacheKey(sanitizedText);

  // Check Redis cache first
  try {
    const redis = getRedis();
    const cachedStr = await redis.get(`sol:${cacheKey}`);
    if (cachedStr) {
      logger.info(`Cache hit for question ${id}`);
      return { ...JSON.parse(cachedStr), fromCache: true };
    }
  } catch (err) {
    logger.warn(`Redis cache read failed: ${err.message}`);
  }

  // Classify question
  const classification = classifyQuestion(questionText, subject, grade);
  classification.board = board || 'CBSE';

  // Select model: Sarvam for Indian languages, Gemma for English/fallback
  const solveModel = selectModel(classification, language);

  // Generate solution (use sanitized text for LLM)
  const solution = await generateSolution(sanitizedText, classification, language, solveModel);

  const result = {
    extractedText: questionText,
    subject: classification.subject,
    topic: classification.topic,
    difficulty: classification.difficulty,
    confidence: solution.confidence,
    solution,
    modelUsed: solveModel,
  };

  // Cache the result in Redis
  try {
    const redis = getRedis();
    await redis.set(`sol:${cacheKey}`, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn(`Redis cache write failed: ${err.message}`);
  }

  return result;
}

/**
 * Extract text from image using Gemma 3 27B Vision via NVIDIA NIM
 */
async function extractTextFromImage(imageBuffer) {
  if (!imageBuffer) throw new Error('No image provided');

  logger.info('OCR: Extracting question from image via Gemma 3 Vision...');

  const base64 = Buffer.isBuffer(imageBuffer)
    ? imageBuffer.toString('base64')
    : imageBuffer; // Already base64

  const extracted = await callVision({
    imageBase64: base64,
    prompt: `Extract ALL text from this homework/exam image accurately.

RULES:
- For mathematical equations, use LaTeX notation (e.g., $x^2 + 5x - 3 = 0$)
- For chemical formulas, use proper notation (e.g., H₂SO₄)
- Preserve question numbers (Q1, Q2, etc.)
- If there are diagrams, describe them briefly in [brackets]
- If text is in Hindi/Devanagari or other Indian languages, preserve the original script
- If handwriting is unclear, mark uncertain parts with [?]
- Separate multiple questions with "---"

Output the extracted text, nothing else.`,
    mimeType: 'image/jpeg',
    maxTokens: 4096,
  });

  logger.info(`OCR extracted ${extracted.length} chars from image`);
  return extracted;
}

/**
 * Classify question by subject, topic, and difficulty
 */
function classifyQuestion(text, hintSubject, hintGrade) {
  let subject = hintSubject;
  if (!subject) {
    if (/(?:solve|equation|x\s*[+=]|integral|differentiat|trigonometr|algebra|geometr|calculus|matrix|matrices|vector|determinant|eigenvalue|eigenvector|linear\s*equation|rank|inverse)/i.test(text)) {
      subject = 'math';
    } else if (/(?:force|velocity|acceleration|energy|momentum|circuit|optics|wave|thermodynamic)/i.test(text)) {
      subject = 'physics';
    } else if (/(?:element|compound|reaction|acid|base|organic|molar|periodic|oxidation|bond)/i.test(text)) {
      subject = 'chemistry';
    } else if (/(?:cell|dna|enzyme|photosynthesis|respiration|evolution|ecology|anatomy|species)/i.test(text)) {
      subject = 'biology';
    } else {
      subject = 'math';
    }
  }

  const topicMap = {
    math: {
      equation: /equation|solve.*x|linear|quadratic/i,
      calculus: /integral|differentiat|limit|derivative/i,
      trigonometry: /sin|cos|tan|trigonometr/i,
      algebra: /algebra|polynomial|factor/i,
      geometry: /triangle|circle|area|volume|geometr/i,
      statistics: /mean|median|mode|probability|statistic/i,
      matrices: /matrix|determinant|matrices|inverse\s*matrix|adjoint|cofactor/i,
      linear_algebra: /eigenvalue|eigenvector|vector\s*space|linear\s*transformation|rank|null\s*space|basis|dimension|row\s*echelon|gaussian|cramer/i,
    },
    physics: {
      mechanics: /force|velocity|acceleration|momentum|newton/i,
      electricity: /circuit|current|resistance|capacitor/i,
      optics: /lens|mirror|refraction|reflection|light/i,
      thermodynamics: /heat|temperature|entropy|thermodynamic/i,
      waves: /wave|frequency|amplitude|sound/i,
    },
    chemistry: {
      organic: /organic|alkane|alkene|alcohol|carbon/i,
      inorganic: /element|periodic|metal|oxidation/i,
      physical: /equilibrium|kinetics|thermochemistry|solution/i,
    },
    biology: {
      cell_biology: /cell|mitosis|meiosis|organelle/i,
      genetics: /dna|gene|heredity|mutation|chromosome/i,
      ecology: /ecosystem|food chain|population|ecology/i,
      physiology: /heart|kidney|liver|digestive|nervous/i,
    },
  };

  let topic = 'general';
  const subjectTopics = topicMap[subject] || {};
  for (const [topicName, pattern] of Object.entries(subjectTopics)) {
    if (pattern.test(text)) {
      topic = topicName;
      break;
    }
  }

  let difficulty = 'medium';
  if (/ncert|class\s*[6-9]|basic|simple/i.test(text)) difficulty = 'easy';
  if (/jee\s*advanced|olympiad|prove\s*that|complex/i.test(text)) difficulty = 'hard';
  if (/jee\s*main|neet|board/i.test(text)) difficulty = 'medium';

  return { subject, topic, difficulty, grade: hintGrade };
}

/**
 * Smart model routing based on subject, difficulty, language, and grade.
 *
 * Routing strategy:
 *   - Indian languages → Sarvam (best for 22 Indian languages)
 *   - Hard math/JEE/NEET/Olympiad → DeepSeek V3.2 (87.5% AIME, best reasoning)
 *   - Medium math/science → QwQ-32B (strong step-by-step math reasoning)
 *   - All other subjects (commerce, humanities, CS, English) → Qwen 3.5-122B (all-rounder)
 *   - Easy questions (Class 1-8) → Qwen 3.5-122B (capable enough, saves routing complexity)
 *   - Vision/OCR → Gemma 3 27B (handled separately in extractTextFromImage)
 */
function selectModel(classification, language) {
  const indianLanguages = ['hi', 'ta', 'te', 'kn', 'bn', 'mr', 'gu', 'ml', 'pa', 'od'];
  const mathScienceSubjects = ['math', 'physics', 'chemistry'];
  const isMathScience = mathScienceSubjects.includes(classification.subject);
  const grade = parseInt(classification.grade, 10) || 10;

  // Indian languages → Sarvam (trained on 22 Indian languages)
  if (indianLanguages.includes(language)) {
    // For hard math in Indian languages, still use DeepSeek (better math) + translate later
    if (isMathScience && classification.difficulty === 'hard') {
      logger.info(`Route: Hard math in ${language} → DeepSeek V3.2 (will solve in English)`);
      return MODELS.DEEPSEEK;
    }
    logger.info(`Route: Indian language (${language}) → Sarvam`);
    return MODELS.SARVAM;
  }

  // Hard math/science (JEE, NEET, Olympiad, Class 11-12 advanced) → DeepSeek V3.2
  if (isMathScience && (classification.difficulty === 'hard' || grade >= 11)) {
    logger.info(`Route: Hard ${classification.subject} (grade ${grade}) → DeepSeek V3.2`);
    return MODELS.DEEPSEEK;
  }

  // Medium math/science (Class 9-12) → QwQ-32B (excellent step-by-step reasoning)
  if (isMathScience && classification.difficulty === 'medium') {
    logger.info(`Route: Medium ${classification.subject} → QwQ-32B`);
    return MODELS.QWQ;
  }

  // Everything else (easy math, biology, commerce, humanities, CS, English) → Qwen 3.5-122B
  logger.info(`Route: ${classification.subject}/${classification.difficulty} → Qwen 3.5-122B`);
  return MODELS.QWEN;
}

/**
 * Get fallback model chain for retries.
 * Each model has a ranked list of alternatives to try on failure.
 */
function getFallbackModels(primaryModel) {
  const fallbacks = {
    [MODELS.DEEPSEEK]: [MODELS.QWQ, MODELS.QWEN, MODELS.SARVAM],
    [MODELS.QWQ]: [MODELS.DEEPSEEK, MODELS.QWEN, MODELS.SARVAM],
    [MODELS.QWEN]: [MODELS.QWQ, MODELS.DEEPSEEK, MODELS.SARVAM],
    [MODELS.SARVAM]: [MODELS.QWEN, MODELS.QWQ, MODELS.DEEPSEEK],
    [MODELS.GEMMA]: [MODELS.QWEN, MODELS.SARVAM],
  };
  return fallbacks[primaryModel] || [MODELS.QWEN, MODELS.SARVAM];
}

/**
 * Generate step-by-step solution using NVIDIA NIM models
 */
async function generateSolution(questionText, classification, language, model) {
  const systemPrompt = buildSolverPrompt(classification, language);

  logger.info(`Solving: subject=${classification.subject}, topic=${classification.topic}, grade=${classification.grade}`);

  try {
    const parsed = await callLLMJson({
      systemPrompt,
      userPrompt: `<student_question>${questionText}</student_question>`,
      model,
      temperature: 0.3,
    });

    // Parse confidence from LLM response if available, fallback to 0.95 for primary model
    const parsedConfidence = parseFloat(parsed.confidence);
    const confidence = (!isNaN(parsedConfidence) && parsedConfidence >= 0 && parsedConfidence <= 1)
      ? parsedConfidence
      : 0.95;

    // Normalize steps: LLMs may return step_number/work or stepNumber/content
    const rawSteps = parsed.steps || [];
    // SECURITY: Sanitize LLM output to strip any HTML/script tags before sending to frontend
    const normalizedSteps = rawSteps.map((step, idx) => ({
      stepNumber: step.stepNumber || step.step_number || idx + 1,
      title: sanitizeLLMOutput(step.title || `Step ${idx + 1}`),
      content: sanitizeLLMOutput(step.content || step.work || ''),
      explanation: sanitizeLLMOutput(step.explanation || ''),
      concept: sanitizeLLMOutput(step.concept || step.key_concept || ''),
      formula: step.formula ? sanitizeLLMOutput(step.formula) : null,
    }));

    return {
      steps: normalizedSteps,
      finalAnswer: sanitizeLLMOutput(parsed.finalAnswer || parsed.final_answer || ''),
      confidence,
      conceptTags: parsed.conceptTags || parsed.key_concepts || [],
      relatedPYQs: parsed.relatedPYQs || parsed.related_pyqs || [],
      alternativeMethod: parsed.alternativeMethod || parsed.alternate_method || null,
    };
  } catch (err) {
    logger.error(`LLM solve failed with ${model}: ${err.message}`);

    // Try fallback models in order
    const fallbacks = getFallbackModels(model);
    for (const fallbackModel of fallbacks) {
      logger.info(`Trying fallback model: ${fallbackModel}`);
      try {
        const fallbackParsed = await callLLMJson({
          systemPrompt,
          userPrompt: `<student_question>${questionText}</student_question>`,
          model: fallbackModel,
          temperature: 0.4,
        });

        const rawSteps = fallbackParsed.steps || [];
        const normalizedSteps = rawSteps.map((step, idx) => ({
          stepNumber: step.stepNumber || step.step_number || idx + 1,
          title: sanitizeLLMOutput(step.title || `Step ${idx + 1}`),
          content: sanitizeLLMOutput(step.content || step.work || ''),
          explanation: sanitizeLLMOutput(step.explanation || ''),
          concept: sanitizeLLMOutput(step.concept || step.key_concept || ''),
          formula: step.formula ? sanitizeLLMOutput(step.formula) : null,
        }));

        const fc = parseFloat(fallbackParsed.confidence);
        return {
          steps: normalizedSteps,
          finalAnswer: sanitizeLLMOutput(fallbackParsed.finalAnswer || fallbackParsed.final_answer || ''),
          confidence: (!isNaN(fc) && fc >= 0 && fc <= 1) ? fc : 0.80,
          conceptTags: fallbackParsed.conceptTags || fallbackParsed.key_concepts || [],
          relatedPYQs: fallbackParsed.relatedPYQs || fallbackParsed.related_pyqs || [],
          alternativeMethod: fallbackParsed.alternativeMethod || fallbackParsed.alternate_method || null,
        };
      } catch (fallbackErr) {
        logger.warn(`Fallback ${fallbackModel} also failed: ${fallbackErr.message}`);
        continue; // Try next fallback
      }
    }

    // All models failed — last resort: plain text from any available model
    logger.error('All models failed for JSON output. Attempting plain text fallback.');
    try {
      const rawText = await callLLM({
        systemPrompt: systemPrompt.replace('Return a JSON object', 'Provide a clear step-by-step solution in plain text').replace('Return your response as a valid JSON', 'Provide a clear step-by-step solution'),
        userPrompt: `<student_question>${questionText}</student_question>`,
        model: MODELS.QWEN,
        temperature: 0.5,
      });

      return {
        steps: [{ stepNumber: 1, title: 'Solution', content: rawText, explanation: '', concept: classification.topic, formula: null }],
        finalAnswer: rawText.split('\n').pop() || rawText.substring(0, 200),
        confidence: 0.60,
        conceptTags: [classification.subject, classification.topic],
        relatedPYQs: [],
        alternativeMethod: null,
      };
    } catch (lastErr) {
      logger.error(`All LLM attempts failed: ${lastErr.message}`);
      throw new Error('Failed to generate solution. Please try again.');
    }
  }
}

/**
 * Evaluate student's Learn Mode response using LLM
 */
export async function evaluateLearnMode({ question, solution, studentResponse }) {
  try {
    const systemPrompt = `You are a patient teacher evaluating if a student understands a concept.
The student was shown a question and must explain their understanding BEFORE seeing the full answer.

Score from 0-100 based on:
- Correct identification of the concept/approach (40 points)
- Correct reasoning or partial work (30 points)
- Use of proper terminology (15 points)
- Clarity of explanation (15 points)

A score of 60+ means the student understands enough to proceed.

Return JSON: { "score": number, "passed": boolean, "feedback": "string", "hint": "string or null" }`;

    // SECURITY: Sanitize student response to prevent prompt injection
    const sanitizedResponse = sanitizePromptInput(studentResponse);
    const userPrompt = `QUESTION: ${sanitizePromptInput(question)}
CORRECT SOLUTION STEPS: ${JSON.stringify(solution.steps?.slice(0, 2))}
STUDENT'S RESPONSE: ${sanitizedResponse}

Evaluate the student's understanding.`;

    const result = await callLLMJson({ systemPrompt, userPrompt, temperature: 0.3 });
    const score = typeof result.score === 'number' ? result.score : 0;
    const passed = typeof result.passed === 'boolean' ? result.passed : score >= 60;
    return {
      score,
      passed,
      feedback: result.feedback || (passed ? 'Good understanding!' : 'Keep trying!'),
      hint: result.hint || undefined,
    };
  } catch {
    // Fallback to simple heuristic evaluation
    const responseLength = studentResponse.length;
    const hasKeyTerms = solution.steps?.some((step) =>
      step.concept && studentResponse.toLowerCase().includes(step.concept.toLowerCase())
    );

    let score = 0;
    if (responseLength > 50) score += 30;
    if (responseLength > 100) score += 20;
    if (hasKeyTerms) score += 30;
    if (/because|therefore|since|this means/i.test(studentResponse)) score += 20;

    const passed = score >= 60;
    return {
      score,
      passed,
      feedback: passed
        ? 'Great understanding! Here\'s the full solution.'
        : 'Good try! Let me give you a hint to help you understand better.',
      hint: !passed
        ? `Think about the concept of "${solution.steps?.[0]?.concept}". Why do we use this approach?`
        : undefined,
    };
  }
}

/**
 * Sanitize user input to protect against prompt injection attacks.
 * Strips known injection patterns, truncates to reasonable length,
 * and prepares text for safe inclusion in LLM prompts.
 */
function sanitizePromptInput(text) {
  if (!text) return '';

  let sanitized = text;

  // Strip known prompt injection patterns
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+(instructions?|prompts?|context)/gi,
    /ignore\s+(the\s+)?above/gi,
    /disregard\s+(all\s+)?previous/gi,
    /you\s+are\s+now\s+/gi,
    /new\s+instructions?:/gi,
    /^system\s*:/gmi,
    /^assistant\s*:/gmi,
    /^human\s*:/gmi,
    /\[system\]/gi,
    /\[assistant\]/gi,
    /<\/?system>/gi,
    /<\/?assistant>/gi,
    /do\s+not\s+follow\s+(your\s+)?instructions/gi,
    /override\s+(your\s+)?(system|instructions)/gi,
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Truncate to reasonable length (2000 chars)
  sanitized = sanitized.substring(0, 2000).trim();

  return sanitized;
}

/**
 * SECURITY: Sanitize LLM output to strip script tags and event handlers.
 * Prevents stored XSS if LLM output is rendered as HTML on the frontend.
 * Preserves LaTeX notation ($...$) and mathematical content.
 */
function sanitizeLLMOutput(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:/gi, '');
}

/**
 * Generate cache key from question text using SHA-256 hash
 */
function generateCacheKey(text) {
  const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(normalizedText).digest('hex');
}

/**
 * Build system prompt for LLM solver
 */
export function buildSolverPrompt(classification, language) {
  const langInstructions = {
    en: 'Respond in English.',
    hi: 'Respond in Hindi (Devanagari script). Use proper Hindi mathematical terminology.',
    ta: 'Respond in Tamil. Use proper Tamil mathematical terminology.',
    te: 'Respond in Telugu.',
    kn: 'Respond in Kannada.',
    bn: 'Respond in Bengali.',
    mr: 'Respond in Marathi.',
    gu: 'Respond in Gujarati.',
    ml: 'Respond in Malayalam.',
    pa: 'Respond in Punjabi (Gurmukhi script).',
    od: 'Respond in Odia.',
  };

  return `${SOLVER_SYSTEM_PROMPT}

ADDITIONAL CONTEXT FOR THIS QUESTION:
- Board: ${classification.board || 'CBSE'}
- Class/Grade: ${classification.grade || 'Unknown'}
- Subject: ${classification.subject}
- Topic: ${classification.topic}
- Difficulty: ${classification.difficulty}
- Language: ${langInstructions[language] || langInstructions.en}

CRITICAL: Return your response as a valid JSON object matching the output format above. Do not include any text before or after the JSON.`;
}
