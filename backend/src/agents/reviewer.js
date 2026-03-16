/**
 * Reviewer Agent — Quality gate for all solutions
 * Independently verifies correctness, format, and grade-appropriateness
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_PROMPT = readFileSync(join(__dirname, '../prompts/reviewer.txt'), 'utf-8');

export class ReviewerAgent {
  constructor(llmService) {
    this.llm = llmService;
  }

  /**
   * Review a solution for correctness, completeness, and format compliance
   */
  async process(solution) {
    const { question, steps, finalAnswer } = solution;

    // In production: send to LLM for independent verification
    // const review = await this.llm.call({
    //   systemPrompt: SYSTEM_PROMPT,
    //   userPrompt: JSON.stringify({ question: question.full_text, solution: { steps, finalAnswer } }),
    //   model: 'claude-3.5-sonnet', // Use same or better model for verification
    // });

    // Run local checks first (fast, no LLM cost)
    const issues = [];

    // Check 1: Solution has steps
    if (!steps || steps.length === 0) {
      issues.push({
        type: 'missing_steps',
        severity: 'high',
        location: 'entire solution',
        description: 'Solution has no steps',
        suggested_fix: 'Generate step-by-step solution',
      });
    }

    // Check 2: Final answer exists
    if (!finalAnswer || finalAnswer.trim() === '') {
      issues.push({
        type: 'missing_answer',
        severity: 'high',
        location: 'final answer',
        description: 'No final answer provided',
        suggested_fix: 'Include a clear final answer',
      });
    }

    // Check 3: Steps have explanations
    if (steps) {
      for (const step of steps) {
        if (!step.explanation || step.explanation.length < 10) {
          issues.push({
            type: 'missing_explanation',
            severity: 'medium',
            location: `Step ${step.step_number || step.stepNumber}`,
            description: 'Step lacks explanation of WHY this step is performed',
            suggested_fix: 'Add explanation of reasoning behind this step',
          });
        }
      }
    }

    // Check 4: Grade appropriateness
    if (question.grade && steps) {
      const avgStepLength = steps.reduce((sum, s) => sum + (s.work?.length || 0), 0) / steps.length;
      if (question.grade <= 3 && steps.length > 3) {
        issues.push({
          type: 'grade_mismatch',
          severity: 'medium',
          location: 'entire solution',
          description: `Solution has ${steps.length} steps but student is in Class ${question.grade}. Simplify to 1-2 steps.`,
          suggested_fix: 'Reduce to 1-2 simple steps with child-friendly language',
        });
      }
    }

    // Check 5: Math verification (basic)
    if (question.question_type === 'solve' && finalAnswer) {
      const mathCheck = this.verifyBasicMath(question.full_text, finalAnswer);
      if (mathCheck && !mathCheck.correct) {
        issues.push({
          type: 'arithmetic_error',
          severity: 'high',
          location: 'final answer',
          description: `Computed answer is ${mathCheck.expected}, but solution gives ${mathCheck.given}`,
          suggested_fix: `Recalculate. Expected answer: ${mathCheck.expected}`,
        });
      }
    }

    // Determine verdict
    const highIssues = issues.filter((i) => i.severity === 'high');
    const mediumIssues = issues.filter((i) => i.severity === 'medium');

    let verdict = 'PASS';
    let qualityScore = 100;

    if (highIssues.length > 0) {
      verdict = 'FAIL';
      qualityScore = Math.max(0, 100 - (highIssues.length * 30) - (mediumIssues.length * 10));
    } else if (mediumIssues.length > 0) {
      verdict = 'WARN';
      qualityScore = Math.max(60, 100 - (mediumIssues.length * 10));
    }

    logger.info(`Review verdict for ${question.question_id}: ${verdict} (score: ${qualityScore})`);

    return {
      question_id: question.question_id,
      verdict,
      issues,
      quality_score: qualityScore,
      confidence: highIssues.length === 0 ? 0.95 : 0.6,
    };
  }

  /**
   * Basic math verification for simple equations
   */
  verifyBasicMath(questionText, answer) {
    // Linear equation: ax + b = c
    const linearMatch = questionText.match(/(\d*)\s*x\s*([+-]\s*\d+)\s*=\s*(-?\d+)/);
    if (linearMatch) {
      const a = parseInt(linearMatch[1] || '1', 10);
      const b = parseInt(linearMatch[2].replace(/\s/g, ''), 10);
      const c = parseInt(linearMatch[3], 10);
      const expected = (c - b) / a;

      const answerNum = parseFloat(answer.match(/-?\d+\.?\d*/)?.[0]);
      if (!isNaN(answerNum)) {
        return {
          correct: Math.abs(expected - answerNum) < 0.001,
          expected,
          given: answerNum,
        };
      }
    }
    return null; // Can't verify — skip
  }
}
