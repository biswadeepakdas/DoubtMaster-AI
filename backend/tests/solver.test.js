import { jest } from '@jest/globals';

// Mock LLM service
const mockCallLLMJson = jest.fn();
const mockCallLLM = jest.fn();
const mockCallVision = jest.fn();

jest.unstable_mockModule('../src/services/llm.js', () => ({
  callLLMJson: mockCallLLMJson,
  callLLM: mockCallLLM,
  callVision: mockCallVision,
  MODELS: {
    GROQ: 'groq-llama',
    SARVAM: 'sarvam-m',
    QWQ: 'qwq-32b',
    GEMMA: 'gemma-3',
  },
}));

jest.unstable_mockModule('../src/db/redis.js', () => ({
  getRedis: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  }),
}));

const { solveQuestion } = await import('../src/services/solver.js');

describe('Solver Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should solve a physics question and return structured steps', async () => {
    mockCallLLMJson.mockResolvedValueOnce({
      steps: [
        { stepNumber: 1, title: 'Given', content: 'u = 20 m/s, g = 10 m/s²', explanation: 'We start with initial velocity.' },
        { stepNumber: 2, title: 'Apply formula', content: 'v² = u² - 2gs', explanation: 'Using kinematic equation.' },
      ],
      finalAnswer: 'Maximum height = 20m',
      confidence: 0.95,
      conceptTags: ['kinematics', 'projectile'],
      animation: {
        title: 'Projectile Motion',
        description: 'Ball thrown upward',
        code: 'function setup() { createCanvas(400, 350); }\nfunction draw() { background(248, 250, 252); ellipse(200, 175, 20); }',
      },
    });

    const result = await solveQuestion({
      id: 'test-1',
      userId: 'user-1',
      textQuestion: 'A ball is thrown upward with velocity 20 m/s. Find maximum height.',
      subject: 'physics',
      class: 11,
      board: 'CBSE',
      language: 'en',
    });

    expect(result.subject).toBe('physics');
    expect(result.solution.steps).toHaveLength(2);
    expect(result.solution.finalAnswer).toContain('20m');
    expect(result.solution.animation).toBeDefined();
    expect(result.solution.animation.code).toContain('createCanvas');
  });

  it('should return null animation when LLM generates broken p5.js', async () => {
    mockCallLLMJson.mockResolvedValueOnce({
      steps: [{ stepNumber: 1, title: 'Step 1', content: 'x = 3', explanation: 'Solved.' }],
      finalAnswer: 'x = 3',
      confidence: 0.9,
      animation: {
        title: 'Graph',
        description: 'Quadratic',
        code: '// broken code with no setup or draw',
      },
    });

    const result = await solveQuestion({
      id: 'test-2',
      userId: 'user-1',
      textQuestion: 'Solve x² - 5x + 6 = 0',
      subject: 'math',
      class: 10,
      board: 'CBSE',
      language: 'en',
    });

    // Animation should be null (graceful degradation) because code lacks setup()/draw()
    expect(result.solution.animation).toBeNull();
    // But the solution itself should still be valid
    expect(result.solution.steps).toHaveLength(1);
    expect(result.solution.finalAnswer).toBe('x = 3');
  });

  it('should return null animation when no animation field in LLM response', async () => {
    mockCallLLMJson.mockResolvedValueOnce({
      steps: [{ stepNumber: 1, title: 'Step 1', content: 'Answer', explanation: 'Done.' }],
      finalAnswer: '42',
      confidence: 0.8,
    });

    const result = await solveQuestion({
      id: 'test-3',
      userId: 'user-1',
      textQuestion: 'What is the capital of India?',
      subject: 'general',
      class: 8,
      board: 'CBSE',
      language: 'en',
    });

    expect(result.solution.animation).toBeNull();
  });

  it('should classify physics questions correctly', async () => {
    mockCallLLMJson.mockResolvedValueOnce({
      steps: [{ stepNumber: 1, title: 'Step', content: 'F = ma', explanation: 'Newton.' }],
      finalAnswer: 'F = 50N',
      confidence: 0.95,
    });

    const result = await solveQuestion({
      id: 'test-4',
      userId: 'user-1',
      textQuestion: 'Find the force when mass is 5kg and acceleration is 10 m/s²',
      class: 9,
      board: 'CBSE',
      language: 'en',
    });

    expect(result.subject).toBe('physics');
    expect(result.topic).toBe('mechanics');
  });

  it('should classify math questions correctly', async () => {
    mockCallLLMJson.mockResolvedValueOnce({
      steps: [{ stepNumber: 1, title: 'Step', content: 'x = 2', explanation: 'Factor.' }],
      finalAnswer: 'x = 2, x = 3',
      confidence: 0.95,
    });

    const result = await solveQuestion({
      id: 'test-5',
      userId: 'user-1',
      textQuestion: 'Solve the quadratic equation x² - 5x + 6 = 0',
      class: 10,
      board: 'CBSE',
      language: 'en',
    });

    expect(result.subject).toBe('math');
    expect(result.topic).toBe('equation');
  });

  it('should fall back to next model on primary failure', async () => {
    mockCallLLMJson
      .mockRejectedValueOnce(new Error('Groq API timeout'))
      .mockResolvedValueOnce({
        steps: [{ stepNumber: 1, title: 'Fallback', content: 'Solved via fallback', explanation: 'Done.' }],
        finalAnswer: 'x = 1',
        confidence: 0.8,
      });

    const result = await solveQuestion({
      id: 'test-6',
      userId: 'user-1',
      textQuestion: 'Solve x + 1 = 2',
      subject: 'math',
      class: 6,
      board: 'CBSE',
      language: 'en',
    });

    expect(result.solution.finalAnswer).toBe('x = 1');
    expect(mockCallLLMJson).toHaveBeenCalledTimes(2); // Primary + fallback
  });
});
