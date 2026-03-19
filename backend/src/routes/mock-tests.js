import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { callLLMJson } from '../services/llm.js';
import { getRedis } from '../db/redis.js';
import { logger } from '../utils/logger.js';
import { getPYQExamples } from '../prompts/mock-test-examples.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

const TEST_CONFIGS = [
  { id: 'cbse-10-math', subject: 'math', board: 'CBSE', class: 10, questionCount: 10, duration: 30, title: 'CBSE Class 10 Math' },
  { id: 'cbse-12-math', subject: 'math', board: 'CBSE', class: 12, questionCount: 10, duration: 30, title: 'CBSE Class 12 Math' },
  { id: 'cbse-12-physics', subject: 'physics', board: 'CBSE', class: 12, questionCount: 10, duration: 30, title: 'CBSE Class 12 Physics' },
  { id: 'cbse-12-chemistry', subject: 'chemistry', board: 'CBSE', class: 12, questionCount: 10, duration: 30, title: 'CBSE Class 12 Chemistry' },
  { id: 'cbse-12-biology', subject: 'biology', board: 'CBSE', class: 12, questionCount: 10, duration: 30, title: 'CBSE Class 12 Biology' },
  { id: 'cbse-10-math-quick', subject: 'math', board: 'CBSE', class: 10, questionCount: 5, duration: 15, title: 'Quick Math Quiz (Class 10)' },
  { id: 'jee-physics', subject: 'physics', board: 'JEE', class: 12, questionCount: 10, duration: 45, title: 'JEE Physics Practice' },
  { id: 'jee-math', subject: 'math', board: 'JEE', class: 12, questionCount: 10, duration: 45, title: 'JEE Math Practice' },
];

const REDIS_TTL = 7200; // 2 hours

/**
 * GET /available — list available mock tests
 */
router.get('/available', (req, res) => {
  const tests = TEST_CONFIGS.map((t) => ({
    id: t.id,
    title: t.title,
    subject: t.subject,
    board: t.board,
    class: t.class,
    questionCount: t.questionCount,
    durationMinutes: t.duration,
  }));
  res.json({ tests });
});

/**
 * POST /start — generate and start a mock test
 */
router.post('/start', async (req, res, next) => {
  try {
    const { testId } = req.body;
    if (!testId) {
      return res.status(400).json({ error: 'testId is required' });
    }

    const config = TEST_CONFIGS.find((t) => t.id === testId);
    if (!config) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const { subject, board, questionCount, duration, title } = config;
    const classLevel = config.class;

    // Generate questions via LLM
    // Get real PYQ examples for few-shot prompting (prevents hallucination)
    const pyqExamples = getPYQExamples(subject, board, classLevel);

    const systemPrompt = `You are an expert Indian education question paper setter who has set papers for ${board} board exams. You follow the EXACT pattern of real ${board} question papers — same style, difficulty, topic distribution, and marking scheme. Return ONLY valid JSON, no extra text.`;
    const userPrompt = `Generate ${questionCount} multiple-choice questions for ${subject} ${board} Class ${classLevel}.

RULES:
1. Each question MUST have exactly 4 options (A, B, C, D) and ONE correct answer
2. Questions must cover a VARIETY of topics from the ${board} Class ${classLevel} ${subject} syllabus
3. Difficulty mix: 30% easy, 50% medium, 20% hard
4. Use LaTeX notation ($...$) for ALL mathematical expressions, chemical formulas, and scientific notation
5. Questions must be ORIGINAL — do not copy from the examples below
6. Each question must be self-contained (no references to diagrams or figures)
7. Correct answers must be VERIFIABLE — no ambiguous or debatable options
8. Options should be plausible (common misconceptions as distractors)
${pyqExamples}

Return JSON in this exact format:
{
  "questions": [
    {
      "id": "q1",
      "question": "What is ...?",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correctAnswer": "B",
      "topic": "Algebra",
      "difficulty": "medium"
    }
  ]
}`;

    logger.info(`Generating mock test: ${testId} for user ${req.user.id}`);

    const result = await callLLMJson({ systemPrompt, userPrompt });

    if (!result.questions || !Array.isArray(result.questions)) {
      throw new Error('LLM returned invalid question format');
    }

    // Assign unique IDs to each question
    const questions = result.questions.map((q, i) => ({
      ...q,
      id: `q${i + 1}`,
    }));

    // Create a unique session ID for this test attempt
    const sessionId = uuidv4();
    const startedAt = new Date().toISOString();

    // Store full test data (with correct answers) in Redis
    const testData = {
      sessionId,
      testId,
      userId: req.user.id,
      title,
      questions,
      durationMinutes: duration,
      startedAt,
    };

    try {
      const redis = getRedis();
      await redis.set(
        `mock_test:${sessionId}`,
        JSON.stringify(testData),
        'EX',
        REDIS_TTL
      );
    } catch (err) {
      logger.error(`Redis write failed for mock test: ${err.message}`);
      return res.status(500).json({ error: 'Failed to save test session' });
    }

    // Return questions WITHOUT correct answers
    const sanitizedQuestions = questions.map(({ correctAnswer, ...q }) => q);

    res.json({
      testId: sessionId,
      title,
      questions: sanitizedQuestions,
      durationMinutes: duration,
      startedAt,
    });
  } catch (error) {
    logger.error(`Mock test start failed: ${error.message}`);
    next(error);
  }
});

/**
 * POST /submit — submit answers and get results
 */
router.post('/submit', async (req, res, next) => {
  try {
    const { testId, answers } = req.body;
    if (!testId || !answers) {
      return res.status(400).json({ error: 'testId and answers are required' });
    }

    // Retrieve test data from Redis
    let testData;
    try {
      const redis = getRedis();
      const raw = await redis.get(`mock_test:${testId}`);
      if (!raw) {
        return res.status(404).json({ error: 'Test session not found or expired' });
      }
      testData = JSON.parse(raw);
    } catch (err) {
      logger.error(`Redis read failed for mock test: ${err.message}`);
      return res.status(500).json({ error: 'Failed to retrieve test session' });
    }

    // Verify the user owns this test
    if (testData.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to this test' });
    }

    const { questions, startedAt } = testData;
    const submittedAt = new Date().toISOString();
    const timeTakenMs = new Date(submittedAt) - new Date(startedAt);
    const timeTakenSeconds = Math.round(timeTakenMs / 1000);

    // Grade each question
    let correctCount = 0;
    const wrongQuestions = [];
    const results = questions.map((q) => {
      const userAnswer = answers[q.id] || null;
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) correctCount++;
      if (!isCorrect) {
        wrongQuestions.push({
          question: q.question,
          userAnswer,
          correctAnswer: q.correctAnswer,
          topic: q.topic,
        });
      }
      return {
        questionId: q.id,
        question: q.question,
        options: q.options,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        topic: q.topic,
        difficulty: q.difficulty,
        explanation: null, // filled below for wrong answers
      };
    });

    const total = questions.length;
    const percentage = Math.round((correctCount / total) * 100);

    // Generate explanations for wrong answers via LLM (batch)
    if (wrongQuestions.length > 0) {
      try {
        const explanationPrompt = wrongQuestions
          .map(
            (wq, i) =>
              `${i + 1}. Question: "${wq.question}" — User answered: ${wq.userAnswer || 'not answered'}, Correct answer: ${wq.correctAnswer}`
          )
          .join('\n');

        const explanationResult = await callLLMJson({
          systemPrompt:
            'You are a helpful tutor. Provide brief (1-2 sentence) explanations for why the correct answer is right. Return valid JSON only.',
          userPrompt: `For each of the following wrong answers, provide a brief 1-2 sentence explanation of why the correct answer is right.\n\n${explanationPrompt}\n\nReturn JSON: { "explanations": ["explanation for q1", "explanation for q2", ...] }`,
        });

        if (explanationResult.explanations && Array.isArray(explanationResult.explanations)) {
          let wrongIdx = 0;
          results.forEach((r) => {
            if (!r.isCorrect && wrongIdx < explanationResult.explanations.length) {
              r.explanation = explanationResult.explanations[wrongIdx];
              wrongIdx++;
            }
          });
        }
      } catch (err) {
        logger.warn(`Failed to generate explanations: ${err.message}`);
        // Non-critical — results are still returned without explanations
      }
    }

    // Clean up Redis (test is done)
    try {
      const redis = getRedis();
      await redis.del(`mock_test:${testId}`);
    } catch (err) {
      logger.warn(`Redis cleanup failed: ${err.message}`);
    }

    res.json({
      score: correctCount,
      total,
      percentage,
      results,
      timeTaken: timeTakenSeconds,
      submittedAt,
    });
  } catch (error) {
    logger.error(`Mock test submit failed: ${error.message}`);
    next(error);
  }
});

export default router;
