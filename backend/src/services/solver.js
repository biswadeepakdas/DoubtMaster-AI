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
5. The "explanation" field MUST be DETAILED (3-5 sentences): explain WHY this step is done, give intuition/analogy, warn about common mistakes, and connect to the next step. Write as a patient tutor, not a textbook.

EXAMPLE of GOOD step content: "2x + 6y = 108  ... (equation 1 multiplied by 2)"
EXAMPLE of BAD step content: "Multiplying equation 1 by 2 to align coefficients"

EXAMPLE of GOOD explanation: "We multiply equation 1 by 2 so that the coefficient of x matches equation 2 — this lets us eliminate x by subtracting. Think of it like balancing a see-saw: we need both sides to have the same weight (coefficient) before we can cancel. Common mistake: forgetting to multiply EVERY term in the equation, not just the x term."
EXAMPLE of BAD explanation: "Multiply to align coefficients."

Return a valid JSON object with these keys:
- steps: array of { stepNumber, title, content, explanation, concept, formula, commonMistake, tip }
  - "content" = the actual math work (equations, substitutions, simplifications)
  - "explanation" = DETAILED why + intuition + common mistakes (3-5 sentences, warm tutor tone)
  - "commonMistake" = one common error students make at this step (string or null)
  - "tip" = a helpful exam/study tip for this step (string or null)
- finalAnswer: string (the concrete numeric/symbolic answer)
- confidence: number between 0 and 1
- conceptTags: array of strings
- relatedPYQs: array of strings (optional)
- alternativeMethod: string or null (if provided, show full working, not just a one-liner)
- conceptSummary: string (2-3 sentence summary of the core concept for quick revision)`;
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
      logger.info(`Cache hit for question (key: ${cacheKey.substring(0, 8)}...)`);
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

  const ocrPrompt = `Extract ALL text from this homework/exam image accurately.

RULES:
- For mathematical equations, use LaTeX notation (e.g., $x^2 + 5x - 3 = 0$)
- For chemical formulas, use proper notation (e.g., H₂SO₄)
- Preserve question numbers (Q1, Q2, etc.)
- If there are diagrams, describe them briefly in [brackets]
- If text is in Hindi/Devanagari or other Indian languages, preserve the original script
- If handwriting is unclear, mark uncertain parts with [?]
- Separate multiple questions with "---"

Output the extracted text, nothing else.`;

  try {
    const extracted = await callVision({
      imageBase64: base64,
      prompt: ocrPrompt,
      mimeType: 'image/jpeg',
      maxTokens: 4096,
    });

    if (!extracted || extracted.trim().length < 3) {
      throw new Error('OCR returned empty or too-short text');
    }

    logger.info(`OCR extracted ${extracted.length} chars from image`);
    return extracted;
  } catch (primaryErr) {
    logger.warn(`Primary OCR (Gemma Vision) failed: ${primaryErr.message}. Trying LLM fallback...`);

    // Fallback: send the base64 image to Groq with a text prompt describing the task
    // This won't do real OCR but at least gives a clear error message
    try {
      const fallbackExtracted = await callVision({
        imageBase64: base64,
        prompt: ocrPrompt,
        mimeType: 'image/jpeg',
        maxTokens: 4096,
        model: 'fallback',
      });
      if (fallbackExtracted && fallbackExtracted.trim().length >= 3) {
        logger.info(`Fallback OCR extracted ${fallbackExtracted.length} chars`);
        return fallbackExtracted;
      }
    } catch (fallbackErr) {
      logger.warn(`Fallback OCR also failed: ${fallbackErr.message}`);
    }

    throw new Error('Could not extract text from image. Please try typing your question instead.');
  }
}

/**
 * Classify question by subject, topic, and difficulty
 */
function classifyQuestion(text, hintSubject, hintGrade) {
  let subject = hintSubject;
  if (!subject) {
    // Check biology BEFORE math — biology terms like "cell division" shouldn't match math
    if (/(?:cell|dna|enzyme|photosynthesis|respiration|evolution|ecology|anatomy|species|mitosis|meiosis|chromosome|nucleus|organ|tissue|blood|heart|lung|kidney|liver|neuron|synapse|hormone|gene|heredity|mutation|protein|amino\s*acid|ribosome|membrane|osmosis|diffusion|ecosystem|food\s*chain|biodiversity|plant|animal|bacteria|virus|fungi|disease|immunity|vaccine|digestion|excretion|reproduction|pollination|germination|xylem|phloem|mitochondria|chloroplast|endoplasmic|golgi|lysosome|vacuole|cytoplasm|amoeba|paramecium|euglena|stomata|transpiration|vein|artery|capillary|platelet|haemoglobin|alveoli|bronchi|nephron|urea|insulin|thyroid|pituitary|ovary|testes|zygote|embryo|foetus|placenta|umbilical)/i.test(text)) {
      subject = 'biology';
    } else if (/(?:solve|equation|x\s*[+=]|integral|differentiat|trigonometr|algebra|geometr|calculus|matrix|matrices|vector|determinant|eigenvalue|eigenvector|linear\s*equation|rank|inverse|quadratic|polynomial|factor|arithmetic|number|fraction|percentage|ratio|proportion|profit|loss|interest|area|volume|perimeter|\d+\s*[+\-*/×÷=]\s*\d+|\d+\s*\+\s*\d+|\d+\s*-\s*\d+|\d+\s*[×x]\s*\d+|find\s+the\s+value|calculate|simplify|evaluate|sum\s+of|product\s+of|divide|multiply|subtract|add\s+\d|square\s*root|cube\s*root|log|HCF|LCM|GCD|prime|sin|cos|tan|theorem|angle|degree|parallel|perpendicular|congruent|similar\s*triangle)/i.test(text)) {
      subject = 'math';
    } else if (/(?:force|velocity|acceleration|energy|momentum|circuit|optics|wave|thermodynamic|gravity|friction|pressure|density|magnetic|electric|current|resistance|capacitor|lens|mirror|refraction|reflection|light|sound|motion|projectile|pendulum|ohm|volt|watt)/i.test(text)) {
      subject = 'physics';
    } else if (/(?:element|compound|reaction|acid|base|organic|molar|periodic|oxidation|bond|ion|atom|molecule|valency|pH|salt|metal|corrosion|electrolysis|hydrocarbon|polymer|catalyst|isotope|electron|proton|neutron)/i.test(text)) {
      subject = 'chemistry';
    } else if (/(?:GDP|economy|demand|supply|inflation|budget|tax|market|trade|revenue|cost|price|profit|monopoly|oligopoly|fiscal|monetary|national\s*income|poverty|unemployment|globalization|WTO|IMF)/i.test(text)) {
      subject = 'economics';
    } else if (/(?:account|ledger|journal|balance\s*sheet|trial\s*balance|debit|credit|depreciation|asset|liability|equity|cash\s*flow|voucher|invoice|stock|inventory|goodwill|capital)/i.test(text)) {
      subject = 'accounts';
    } else if (/(?:business|management|marketing|entrepreneur|partnership|company|share|debenture|stock\s*exchange|consumer|insurance|warehouse|transport|communication|e-commerce)/i.test(text)) {
      subject = 'business';
    } else if (/(?:program|algorithm|loop|function|variable|array|class|object|database|SQL|HTML|CSS|python|java|binary|boolean|stack|queue|network|internet|cyber|computer)/i.test(text)) {
      subject = 'cs';
    } else if (/(?:essay|letter|comprehension|grammar|tense|noun|verb|adjective|prose|poetry|drama|summary|character|theme|figure\s*of\s*speech|paragraph|debate|speech|report\s*writing)/i.test(text)) {
      subject = 'english';
    } else {
      // Default to general — let the LLM figure it out
      subject = 'general';
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
      cell_biology: /cell|mitosis|meiosis|organelle|membrane|nucleus|cytoplasm|osmosis|diffusion/i,
      genetics: /dna|gene|heredity|mutation|chromosome|protein|amino\s*acid|ribosome/i,
      ecology: /ecosystem|food\s*chain|population|ecology|biodiversity|environment/i,
      human_body: /heart|lung|kidney|liver|blood|neuron|brain|digestion|excretion|hormone|organ|tissue/i,
      plant_biology: /photosynthesis|respiration|xylem|phloem|pollination|germination|transpiration|plant/i,
      reproduction: /reproduction|fertilization|embryo|puberty|menstrual/i,
      microbiology: /bacteria|virus|fungi|disease|immunity|vaccine|antibiotic/i,
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

  return { subject, topic, difficulty, grade: hintGrade, _questionText: text };
}

/**
 * Smart model routing — all via NVIDIA NIM (single API key)
 *
 * Routing:
 *   - Math/Physics (hard) → DeepSeek-R1 (best reasoning, ~5-15s)
 *   - ALL subjects (primary) → DeepSeek-R1 via NVIDIA NIM
 *   - Indian languages (non-Hindi) → Sarvam-M (Odia, Kannada, Tamil, etc.)
 *   - Hindi → DeepSeek-R1 (handles Hindi well)
 *   - Hard math fallback → QwQ-32B (slower but strong reasoning)
 *   - Vision/OCR → Nemotron VL 12B (reads images, handwriting)
 *
 * If GROQ_API_KEY is set, Groq Llama is used as primary (faster, ~1-3s).
 * If not set, DeepSeek-R1 on NVIDIA NIM is used automatically.
 */
function selectModel(classification, language) {
  // Indian languages that Groq/Llama handles poorly → Sarvam
  const sarvamLanguages = ['ta', 'te', 'kn', 'bn', 'mr', 'gu', 'ml', 'pa', 'od'];

  if (sarvamLanguages.includes(language)) {
    logger.info(`Route: Indian language (${language}) → Sarvam`);
    return MODELS.SARVAM;
  }

  // Hindi works on Groq Llama — tested and confirmed
  // Everything else (all subjects, all difficulties, English + Hindi) → Groq
  logger.info(`Route: ${classification.subject}/${classification.difficulty} (${language || 'en'}) → Groq Llama 3.3 70B`);
  return MODELS.GROQ;
}

/**
 * Get fallback model chain for retries.
 * Groq fails → QwQ (hard math) or Sarvam (Indian langs)
 * QwQ fails → Groq → Sarvam
 * Sarvam fails → Groq → QwQ
 */
function getFallbackModels(primaryModel) {
  const fallbacks = {
    [MODELS.GROQ]: [MODELS.QWQ, MODELS.SARVAM],
    [MODELS.QWQ]: [MODELS.GROQ, MODELS.SARVAM],
    [MODELS.SARVAM]: [MODELS.GROQ, MODELS.QWQ],
    [MODELS.GEMMA]: [MODELS.GROQ, MODELS.SARVAM],
  };
  return fallbacks[primaryModel] || [MODELS.GROQ, MODELS.SARVAM];
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
      commonMistake: step.commonMistake || step.common_mistake ? sanitizeLLMOutput(step.commonMistake || step.common_mistake) : null,
      tip: step.tip ? sanitizeLLMOutput(step.tip) : null,
    }));

    return {
      steps: normalizedSteps,
      finalAnswer: sanitizeLLMOutput(parsed.finalAnswer || parsed.final_answer || ''),
      confidence,
      conceptTags: parsed.conceptTags || parsed.key_concepts || [],
      relatedPYQs: parsed.relatedPYQs || parsed.related_pyqs || [],
      alternativeMethod: parsed.alternativeMethod || parsed.alternate_method || null,
      conceptSummary: parsed.conceptSummary || parsed.concept_summary || null,
      diagram: parsed.diagram || null,
      animation: validateAnimation(parsed.animation),
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
          commonMistake: step.commonMistake || step.common_mistake ? sanitizeLLMOutput(step.commonMistake || step.common_mistake) : null,
          tip: step.tip ? sanitizeLLMOutput(step.tip) : null,
        }));

        const fc = parseFloat(fallbackParsed.confidence);
        return {
          steps: normalizedSteps,
          finalAnswer: sanitizeLLMOutput(fallbackParsed.finalAnswer || fallbackParsed.final_answer || ''),
          confidence: (!isNaN(fc) && fc >= 0 && fc <= 1) ? fc : 0.80,
          conceptTags: fallbackParsed.conceptTags || fallbackParsed.key_concepts || [],
          relatedPYQs: fallbackParsed.relatedPYQs || fallbackParsed.related_pyqs || [],
          alternativeMethod: fallbackParsed.alternativeMethod || fallbackParsed.alternate_method || null,
          conceptSummary: fallbackParsed.conceptSummary || fallbackParsed.concept_summary || null,
          diagram: fallbackParsed.diagram || null,
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
        model: MODELS.GROQ,
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
 * Validate LLM-generated animation — return null if broken so frontend shows text-only fallback.
 */
function validateAnimation(animation) {
  if (!animation || !animation.code) return null;

  const code = typeof animation.code === 'string' ? animation.code : '';
  if (!code.trim()) return null;

  // Must have setup() and draw() for p5.js
  if (!/function\s+setup\s*\(/.test(code) || !/function\s+draw\s*\(/.test(code)) {
    logger.warn('Animation validation failed: missing setup() or draw()');
    return null;
  }

  // Must have createCanvas
  if (!/createCanvas\s*\(/.test(code)) {
    logger.warn('Animation validation failed: missing createCanvas()');
    return null;
  }

  // Check for obviously unbalanced braces (off by more than 1)
  const opens = (code.match(/{/g) || []).length;
  const closes = (code.match(/}/g) || []).length;
  if (Math.abs(opens - closes) > 1) {
    logger.warn(`Animation validation failed: unbalanced braces (${opens} open, ${closes} close)`);
    return null;
  }

  return {
    title: animation.title || 'Animation',
    description: animation.description || '',
    code,
  };
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
// Cache version — increment to bust all stale cached results
const CACHE_VERSION = 'v4';

function generateCacheKey(text) {
  const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(`${CACHE_VERSION}:${normalizedText}`).digest('hex');
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

  // Add diagram instructions for subjects that benefit from visuals
  // Diagram for science subjects or when question explicitly asks for one
  const diagramSubjects = ['biology', 'physics', 'chemistry', 'economics', 'cs'];
  const questionAsksDiagram = /diagram|draw|illustrate|sketch|flow\s*chart|label/i.test(classification._questionText || '');
  const shouldIncludeDiagram = diagramSubjects.includes(classification.subject) || questionAsksDiagram;
  const diagramInstruction = shouldIncludeDiagram
    ? `\n\nDIAGRAM: You MUST include a "diagram" field in your JSON response with Mermaid.js flowchart code.
Rules:
- Start with "graph TD" (top-down) or "graph LR" (left-right)
- Label nodes with descriptive text in brackets: A[Prophase] --> B[Metaphase]
- Use arrow labels for relationships: A -->|pumps blood| B
- DO NOT use "style" directives (e.g. style A fill:#f9f) — they cause syntax errors
- DO NOT use "classDef" — keep it simple
- Keep it clean: just nodes and arrows, no CSS
- Example: "graph TD\\n  A[Right Atrium] -->|deoxygenated blood| B[Right Ventricle]\\n  B --> C[Lungs]\\n  C -->|oxygenated blood| D[Left Atrium]"
- The diagram must visually represent the concept or process being explained.`
    : '';

  // Animation for visual subjects (math graphs, physics motion, biology processes, chemistry reactions)
  const animatableSubjects = ['math', 'physics', 'biology', 'chemistry'];
  const animatableTopics = ['equation', 'calculus', 'trigonometry', 'geometry', 'statistics', 'mechanics', 'waves', 'optics', 'cell_biology', 'genetics', 'ecology', 'physiology', 'organic', 'physical', 'matrices', 'linear_algebra'];
  const shouldAnimate = animatableSubjects.includes(classification.subject) &&
    (animatableTopics.includes(classification.topic) || classification.difficulty !== 'easy');
  const animationInstruction = shouldAnimate
    ? `\n\nANIMATION: Include an "animation" field in your JSON with a p5.js sketch object:
"animation": { "title": "...", "description": "...", "code": "<p5.js code>" }

The code MUST define setup() and draw() functions. Use \\n for newlines in the code string. Keep under 80 lines. Do NOT use external libraries besides p5.js.

=== P5.JS DESIGN RULES (FOLLOW STRICTLY) ===

SETUP:
- createCanvas(400, 350);
- smooth();  // MUST call for anti-aliasing
- frameRate(30);
- textFont('sans-serif');

BACKGROUND & COLORS:
- Background: background(248, 250, 252);  // clean near-white #F8FAFC, NEVER use background(220) or gray
- Primary palette:
  - Teal: fill(13, 148, 136) or stroke(13, 148, 136)     // #0D9488
  - Emerald: fill(16, 185, 129)                            // #10B981
  - Indigo: fill(99, 102, 241)                              // #6366F1
  - Slate text: fill(51, 65, 85)                            // #334155
- Use alpha for overlays: fill(13, 148, 136, 50) for transparent teal

GRID & AXES:
- Grid lines: stroke(226, 232, 240); strokeWeight(0.5);   // very faint #E2E8F0
- Axes: stroke(100, 116, 139); strokeWeight(1.5);         // slate #64748B
- Add tick marks every grid unit
- Label axes with textSize(10), fill(100, 116, 139)
- Helper function drawGrid() that draws faint horizontal and vertical lines

SHAPES & LINES:
- strokeWeight(2) minimum for all visible lines
- Use rounded rectangles: rect(x, y, w, h, 8) for labels/pills
- Prefer ellipse over circle for organic shapes
- Use beginShape()/endShape() for smooth curves

MOTION & ANIMATION:
- Use lerp() or sin()-based easing for ALL motion — NEVER linear jumps
- Show trail/ghost effect: draw previous positions with low alpha before current position
- Example trail: fill(13, 148, 136, 40); ellipse(prevX, prevY, 12); then fill(13, 148, 136); ellipse(x, y, 14);
- Use frameCount for time-based animation: let t = frameCount * 0.02;

TEXT & LABELS:
- Title at top: textSize(13); fill(51, 65, 85); textAlign(CENTER); text(title, 200, 20);
- Labels: textSize(11); fill(51, 65, 85);
- Use pill backgrounds for value labels:
    fill(255, 255, 255, 220); rect(x+10, y-20, 80, 22, 8);
    fill(51, 65, 85); textSize(11); text(label, x+14, y-5);
- Always show units in labels (m/s, N, cm, etc.)

=== PHYSICS ACCURACY RULES (MANDATORY) ===
- MUST use correct physics formulas: v = u + at, s = ut + 0.5*a*t^2, F = ma, E = 0.5*m*v^2, etc.
- Define a SCALE variable to map real units to pixels (e.g., let SCALE = 5; // 1 meter = 5 pixels)
- Show labeled axes with REAL UNITS (m, s, m/s, N, kg, J) — NEVER just pixel values
- Display initial conditions as text on canvas (e.g., "u = 20 m/s, θ = 45°, g = 9.8 m/s²")
- Show a live info box updating with real values: t(s), v(m/s), h(m), x(m) during animation
- Draw vectors with correct direction and magnitude (velocity, acceleration, force)
- NEVER use arbitrary pixel motion — ALL positions must be computed from physics equations

=== MATH GRAPH RULES (MANDATORY) ===
- Draw a proper coordinate grid with origin at a visible point
- Label X and Y axes with numeric tick marks and variable names
- Use correct mathematical functions (Math.sin, Math.pow, etc.) — not approximations
- Mark key points: roots (where y=0), vertex/extrema, intercepts, asymptotes
- For quadratics: show vertex, axis of symmetry, discriminant-based roots
- For trig: show amplitude, period, phase shift as labeled markers

SUBJECT-SPECIFIC RULES:
- GRAPHS (math): Draw coordinate grid with numeric ticks, plot function with thick teal line (strokeWeight(2.5)), mark roots/vertex with filled circles and labels showing coordinates
- PHYSICS: Use REAL formulas for ALL motion. Show velocity/force vectors as arrows with magnitude labels. Trajectory as dotted trail. Live info box with t, v, x, y in real units. SCALE factor for unit-to-pixel mapping.
- BIOLOGY: Use soft organic shapes (ellipses with low-alpha fills), pastel colors (fill with alpha 80-120), label all structures
- CHEMISTRY: Use circles for atoms with element labels inside, connecting lines for bonds, animate reaction progress

EXAMPLE OF GOOD PHYSICS CODE (projectile with real formulas):
let u = 20; // initial velocity m/s
let angle = 45; // degrees
let g = 9.8; // gravity m/s^2
let SCALE = 8; // pixels per meter
let t = 0;
let ox = 60, oy = 300; // origin on canvas
function setup() { createCanvas(400, 350); smooth(); frameRate(30); textFont('sans-serif'); }
function draw() {
  background(248, 250, 252);
  noStroke(); fill(51, 65, 85); textSize(13); textAlign(CENTER); text('Projectile Motion', 200, 22);
  // Grid
  stroke(226, 232, 240); strokeWeight(0.5);
  for (let x = ox; x < 380; x += 30) line(x, 40, x, oy);
  for (let y = 40; y < oy; y += 30) line(ox, y, 380, y);
  // Axes with labels
  stroke(100, 116, 139); strokeWeight(1.5); line(ox, oy, 380, oy); line(ox, 40, ox, oy);
  noStroke(); fill(100, 116, 139); textSize(10); textAlign(CENTER);
  text('x (m)', 220, oy + 15); textAlign(RIGHT); text('y (m)', ox - 5, 170);
  // Real physics
  let rad = angle * PI / 180;
  let ux = u * cos(rad), uy = u * sin(rad);
  t = (frameCount % 150) * 0.03;
  let realX = ux * t;
  let realY = uy * t - 0.5 * g * t * t;
  if (realY < 0) { realY = 0; t = 0; }
  let px = ox + realX * SCALE, py = oy - realY * SCALE;
  // Trail
  noStroke();
  for (let i = 0; i < t; i += 0.05) {
    let rx = ux * i, ry = uy * i - 0.5 * g * i * i;
    if (ry >= 0) { fill(13, 148, 136, 30); ellipse(ox + rx * SCALE, oy - ry * SCALE, 4); }
  }
  // Ball
  fill(13, 148, 136); ellipse(px, py, 14);
  // Info box
  fill(255, 255, 255, 230); rect(240, 45, 150, 70, 8);
  fill(51, 65, 85); noStroke(); textSize(11); textAlign(LEFT);
  text('t = ' + t.toFixed(2) + ' s', 250, 62);
  text('x = ' + realX.toFixed(1) + ' m', 250, 78);
  text('y = ' + realY.toFixed(1) + ' m', 250, 94);
  text('v = ' + sqrt(ux*ux + pow(uy - g*t, 2)).toFixed(1) + ' m/s', 250, 110);
}

DO NOT generate ugly/default code. NEVER use background(220). NEVER use default gray colors. ALWAYS include grid, labels, smooth motion, and the teal/emerald palette.`
    : '';

  return `${SOLVER_SYSTEM_PROMPT}

ADDITIONAL CONTEXT FOR THIS QUESTION:
- Board: ${classification.board || 'CBSE'}
- Class/Grade: ${classification.grade || 'Unknown'}
- Subject: ${classification.subject}
- Topic: ${classification.topic}
- Difficulty: ${classification.difficulty}
- Language: ${langInstructions[language] || langInstructions.en}
${diagramInstruction}${animationInstruction}

CRITICAL: Return your response as a valid JSON object matching the output format above. Do not include any text before or after the JSON.`;
}
