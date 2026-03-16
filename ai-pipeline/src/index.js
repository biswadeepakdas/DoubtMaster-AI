/**
 * DoubtMaster AI Pipeline
 * Multi-modal question solving: Image → OCR → Classification → LLM → Steps
 *
 * Agent 5: AI/ML Vision & LLM Architect
 */

import { OCREngine } from './ocr/engine.js';
import { LLMRouter } from './llm/router.js';
import { MathEngine } from './math-engine/solver.js';
import { CurriculumMapper } from './curriculum/mapper.js';
import { MultilingualEngine } from './multilingual/translator.js';

export class AIPipeline {
  constructor(config = {}) {
    this.ocr = new OCREngine(config.ocr);
    this.llm = new LLMRouter(config.llm);
    this.math = new MathEngine();
    this.curriculum = new CurriculumMapper();
    this.multilingual = new MultilingualEngine(config.multilingual);
    this.cache = new Map();
  }

  /**
   * Main solve pipeline
   * @param {Object} input - { image?: Buffer, text?: string, language: string, subject?: string, class?: number, board?: string }
   * @returns {Object} - { steps, finalAnswer, confidence, metadata }
   */
  async solve(input) {
    const startTime = Date.now();

    // Step 1: Extract text from image (if provided)
    let questionText = input.text;
    let ocrConfidence = 1.0;
    if (input.image) {
      const ocrResult = await this.ocr.extract(input.image);
      questionText = ocrResult.text;
      ocrConfidence = ocrResult.confidence;
    }

    if (!questionText) {
      throw new Error('Could not extract question text');
    }

    // Step 2: Check cache
    const cacheKey = this.generateCacheKey(questionText);
    if (this.cache.has(cacheKey)) {
      return { ...this.cache.get(cacheKey), fromCache: true, pipelineTimeMs: Date.now() - startTime };
    }

    // Step 3: Classify and map to curriculum
    const classification = this.curriculum.classify(questionText, {
      subject: input.subject,
      class: input.class,
      board: input.board,
    });

    // Step 4: Route to appropriate LLM
    const solution = await this.llm.solve(questionText, classification);

    // Step 5: Verify math (if applicable)
    if (classification.subject === 'math') {
      const verification = this.math.verify(solution.finalAnswer, questionText);
      solution.verified = verification.correct;
      solution.confidence = verification.correct ? Math.max(solution.confidence, 0.99) : solution.confidence * 0.8;
    }

    // Step 6: Translate if needed
    if (input.language && input.language !== 'en') {
      solution.steps = await this.multilingual.translateSteps(solution.steps, input.language);
      solution.finalAnswer = await this.multilingual.translate(solution.finalAnswer, input.language);
    }

    const result = {
      extractedText: questionText,
      ocrConfidence,
      classification,
      solution,
      pipelineTimeMs: Date.now() - startTime,
    };

    // Cache result
    this.cache.set(cacheKey, result);

    return result;
  }

  generateCacheKey(text) {
    return text.toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 500);
  }
}

export default AIPipeline;
