import { logger } from '../utils/logger.js';

/**
 * AI Question Solver Service
 * Multi-model pipeline: Image → OCR → Classification → LLM Solve → Steps Generation
 */

// Solution cache (Redis in production)
const solutionCache = new Map();

/**
 * Main solve pipeline
 */
export async function solveQuestion({ id, userId, image, textQuestion, subject, class: grade, board, language, userPlan }) {
  const questionText = textQuestion || await extractTextFromImage(image);
  const cacheKey = generateCacheKey(questionText);

  // Check cache first
  const cached = solutionCache.get(cacheKey);
  if (cached) {
    logger.info(`Cache hit for question ${id}`);
    return { ...cached, fromCache: true };
  }

  // Classify question
  const classification = classifyQuestion(questionText, subject, grade);

  // Select model based on difficulty and user plan
  const model = selectModel(classification, userPlan);

  // Generate solution
  const solution = await generateSolution(questionText, classification, model, language);

  const result = {
    extractedText: questionText,
    subject: classification.subject,
    topic: classification.topic,
    difficulty: classification.difficulty,
    confidence: solution.confidence,
    solution: solution,
    modelUsed: model,
  };

  // Cache the result
  solutionCache.set(cacheKey, result);

  return result;
}

/**
 * Extract text from image using OCR/Vision
 */
async function extractTextFromImage(imageBuffer) {
  if (!imageBuffer) throw new Error('No image provided');

  // In production: call GPT-4o Vision API
  // const response = await openai.chat.completions.create({
  //   model: 'gpt-4o',
  //   messages: [{
  //     role: 'user',
  //     content: [
  //       { type: 'text', text: 'Extract the math/science question from this image. Output LaTeX for equations.' },
  //       { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` } }
  //     ]
  //   }]
  // });

  // Demo: return placeholder
  logger.info('OCR processing image...');
  return 'Solve: Find the value of x in 2x + 5 = 15';
}

/**
 * Classify question by subject, topic, and difficulty
 */
function classifyQuestion(text, hintSubject, hintGrade) {
  const lowerText = text.toLowerCase();

  // Subject detection
  let subject = hintSubject;
  if (!subject) {
    if (/(?:solve|equation|x\s*[+=]|integral|differentiat|trigonometr|algebra|geometr|calculus|matrix|vector)/i.test(text)) {
      subject = 'math';
    } else if (/(?:force|velocity|acceleration|energy|momentum|circuit|optics|wave|thermodynamic)/i.test(text)) {
      subject = 'physics';
    } else if (/(?:element|compound|reaction|acid|base|organic|molar|periodic|oxidation|bond)/i.test(text)) {
      subject = 'chemistry';
    } else if (/(?:cell|dna|enzyme|photosynthesis|respiration|evolution|ecology|anatomy|species)/i.test(text)) {
      subject = 'biology';
    } else {
      subject = 'math'; // Default
    }
  }

  // Topic detection (simplified)
  const topicMap = {
    math: {
      equation: /equation|solve.*x|linear|quadratic/i,
      calculus: /integral|differentiat|limit|derivative/i,
      trigonometry: /sin|cos|tan|trigonometr/i,
      algebra: /algebra|polynomial|factor/i,
      geometry: /triangle|circle|area|volume|geometr/i,
      statistics: /mean|median|mode|probability|statistic/i,
      matrices: /matrix|determinant|matrices/i,
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

  // Difficulty estimation
  let difficulty = 'medium';
  if (/ncert|class\s*[6-9]|basic|simple/i.test(text)) difficulty = 'easy';
  if (/jee\s*advanced|olympiad|prove\s*that|complex/i.test(text)) difficulty = 'hard';
  if (/jee\s*main|neet|board/i.test(text)) difficulty = 'medium';

  return { subject, topic, difficulty, grade: hintGrade };
}

/**
 * Select the best model based on question difficulty and user plan
 */
function selectModel(classification, userPlan) {
  const { difficulty } = classification;

  // Model selection strategy (cost vs accuracy optimization)
  if (difficulty === 'easy') return 'llama-3.1-70b'; // Self-hosted, cheapest
  if (difficulty === 'medium') return 'claude-3.5-sonnet'; // Best balance
  if (difficulty === 'hard') return 'gpt-4o'; // Highest accuracy
  return 'claude-3.5-sonnet';
}

/**
 * Generate step-by-step solution using selected LLM
 */
async function generateSolution(questionText, classification, model, language) {
  // In production: call actual LLM API
  // const systemPrompt = buildSolverPrompt(classification, language);
  // const response = await callLLM(model, systemPrompt, questionText);

  // Demo solution with realistic step-by-step format
  const demoSolutions = {
    math: generateMathSolution(questionText),
    physics: generatePhysicsSolution(questionText),
    chemistry: generateChemistrySolution(questionText),
    biology: generateBiologySolution(questionText),
  };

  const solution = demoSolutions[classification.subject] || demoSolutions.math;

  return {
    steps: solution.steps,
    finalAnswer: solution.finalAnswer,
    confidence: 0.97,
    conceptTags: solution.conceptTags,
    relatedPYQs: solution.relatedPYQs || [],
    alternativeMethod: solution.alternativeMethod || null,
  };
}

function generateMathSolution(text) {
  return {
    steps: [
      {
        stepNumber: 1,
        title: 'Understand the Problem',
        content: 'We need to solve the linear equation: 2x + 5 = 15',
        explanation: 'This is a linear equation in one variable. Our goal is to isolate x.',
        concept: 'Linear Equations',
        formula: null,
      },
      {
        stepNumber: 2,
        title: 'Subtract 5 from both sides',
        content: '2x + 5 - 5 = 15 - 5\n2x = 10',
        explanation: 'We subtract 5 from both sides to move the constant to the right side. This uses the property that equal operations on both sides maintain equality.',
        concept: 'Additive Inverse',
        formula: 'a + b = c → a = c - b',
      },
      {
        stepNumber: 3,
        title: 'Divide both sides by 2',
        content: '2x / 2 = 10 / 2\nx = 5',
        explanation: 'We divide both sides by 2 (the coefficient of x) to get x alone.',
        concept: 'Multiplicative Inverse',
        formula: 'ax = b → x = b/a',
      },
      {
        stepNumber: 4,
        title: 'Verify the answer',
        content: 'Check: 2(5) + 5 = 10 + 5 = 15 ✓',
        explanation: 'Always verify by substituting back into the original equation.',
        concept: 'Verification',
        formula: null,
      },
    ],
    finalAnswer: 'x = 5',
    conceptTags: ['Linear Equations', 'NCERT Class 7 Ch.4', 'Algebra'],
    relatedPYQs: ['CBSE 2023 Q4(a)', 'JEE Main 2024 Shift 1 Q2'],
  };
}

function generatePhysicsSolution(text) {
  return {
    steps: [
      {
        stepNumber: 1,
        title: 'Identify Given Information',
        content: 'List all known quantities and what needs to be found.',
        explanation: 'Always start by organizing given data and identifying the unknown.',
        concept: 'Problem Analysis',
        formula: null,
      },
      {
        stepNumber: 2,
        title: 'Select Appropriate Formula',
        content: 'Based on the given quantities, select the relevant physics formula.',
        explanation: 'Match the known and unknown quantities to the correct equation.',
        concept: 'Formula Selection',
        formula: 'F = ma, v = u + at, s = ut + ½at²',
      },
      {
        stepNumber: 3,
        title: 'Substitute and Calculate',
        content: 'Plug in the values and solve.',
        explanation: 'Ensure units are consistent before substituting.',
        concept: 'Calculation',
        formula: null,
      },
    ],
    finalAnswer: 'See step-by-step solution above',
    conceptTags: ['Mechanics', 'Newton\'s Laws'],
  };
}

function generateChemistrySolution(text) {
  return {
    steps: [
      {
        stepNumber: 1,
        title: 'Identify the Reaction Type',
        content: 'Determine whether this is a synthesis, decomposition, single/double displacement, or redox reaction.',
        explanation: 'Understanding the reaction type guides the solution approach.',
        concept: 'Reaction Classification',
        formula: null,
      },
      {
        stepNumber: 2,
        title: 'Balance the Equation',
        content: 'Ensure atoms of each element are equal on both sides.',
        explanation: 'Conservation of mass requires balanced equations.',
        concept: 'Stoichiometry',
        formula: null,
      },
    ],
    finalAnswer: 'See balanced equation above',
    conceptTags: ['Chemical Reactions', 'Stoichiometry'],
  };
}

function generateBiologySolution(text) {
  return {
    steps: [
      {
        stepNumber: 1,
        title: 'Define Key Terms',
        content: 'Identify and define the biological concepts in the question.',
        explanation: 'Clear definitions form the foundation of the answer.',
        concept: 'Terminology',
        formula: null,
      },
      {
        stepNumber: 2,
        title: 'Explain the Process/Mechanism',
        content: 'Describe the biological process step by step.',
        explanation: 'Biology answers require detailed process explanations.',
        concept: 'Biological Process',
        formula: null,
      },
    ],
    finalAnswer: 'See detailed explanation above',
    conceptTags: ['Biology', 'NCERT'],
  };
}

/**
 * Evaluate student's Learn Mode response
 */
export async function evaluateLearnMode({ question, solution, studentResponse }) {
  // In production: use LLM to evaluate understanding
  // const evaluation = await callLLM('claude-3.5-sonnet', evaluationPrompt, studentResponse);

  const responseLength = studentResponse.length;
  const hasKeyTerms = solution.steps.some((step) =>
    step.concept && studentResponse.toLowerCase().includes(step.concept.toLowerCase())
  );

  // Simple scoring (LLM-based in production)
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
      ? 'Great understanding! You\'ve grasped the core concepts. Here\'s the full solution.'
      : 'Good try! Let me give you a hint to help you understand better.',
    hint: !passed
      ? `Think about the concept of "${solution.steps[0]?.concept}". Why do we use this approach?`
      : undefined,
  };
}

/**
 * Generate cache key from question text
 */
function generateCacheKey(text) {
  // Normalize: lowercase, remove extra spaces, trim
  return text.toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 500);
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

  return `You are DoubtMaster AI, India's most accurate homework solver.
You specialize in ${classification.subject} for Indian students.

RULES:
1. Provide step-by-step solutions with clear explanations
2. Tag each step with the concept/formula used
3. Reference NCERT chapter when applicable
4. For JEE/NEET questions, reference previous year question patterns
5. Always verify the final answer
6. ${langInstructions[language] || langInstructions.en}
7. Use LaTeX notation for mathematical expressions
8. Explain WHY each step works, not just HOW

CURRICULUM CONTEXT:
- Board: ${classification.board || 'CBSE'}
- Class: ${classification.grade || 'Unknown'}
- Subject: ${classification.subject}
- Topic: ${classification.topic}

OUTPUT FORMAT:
Return a JSON object with:
{
  "steps": [{ "stepNumber": 1, "title": "...", "content": "...", "explanation": "...", "concept": "...", "formula": "..." }],
  "finalAnswer": "...",
  "conceptTags": ["..."],
  "relatedPYQs": ["..."],
  "alternativeMethod": "..." (optional)
}`;
}
