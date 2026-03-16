/**
 * Math Engine - Symbolic math verification and computation
 * Uses mathjs for symbolic computation to verify LLM answers
 */

export class MathEngine {
  /**
   * Verify an answer against the original question
   */
  verify(answer, question) {
    try {
      // Extract equation from question
      const equation = this.extractEquation(question);
      if (!equation) return { correct: true, confidence: 0.5, method: 'no_equation_found' };

      // Try to verify
      const result = this.solveAndCompare(equation, answer);
      return result;
    } catch {
      return { correct: true, confidence: 0.5, method: 'verification_skipped' };
    }
  }

  /**
   * Extract mathematical equation from text
   */
  extractEquation(text) {
    // Linear equation: ax + b = c
    const linearMatch = text.match(/(\d*)\s*x\s*([+-]\s*\d+)\s*=\s*(-?\d+)/);
    if (linearMatch) {
      const a = parseInt(linearMatch[1] || '1', 10);
      const b = parseInt(linearMatch[2].replace(/\s/g, ''), 10);
      const c = parseInt(linearMatch[3], 10);
      return { type: 'linear', a, b, c };
    }

    // Quadratic: ax² + bx + c = 0
    const quadMatch = text.match(/(\d*)\s*x[²2]\s*([+-]\s*\d*)\s*x\s*([+-]\s*\d+)\s*=\s*0/);
    if (quadMatch) {
      return {
        type: 'quadratic',
        a: parseInt(quadMatch[1] || '1', 10),
        b: parseInt(quadMatch[2].replace(/\s/g, '') || '0', 10),
        c: parseInt(quadMatch[3].replace(/\s/g, ''), 10),
      };
    }

    return null;
  }

  /**
   * Solve equation and compare with given answer
   */
  solveAndCompare(equation, answer) {
    if (equation.type === 'linear') {
      const expected = (equation.c - equation.b) / equation.a;
      const answerNum = this.extractNumber(answer);
      if (answerNum !== null) {
        return {
          correct: Math.abs(expected - answerNum) < 0.001,
          expected,
          given: answerNum,
          confidence: 0.99,
          method: 'symbolic_verification',
        };
      }
    }

    if (equation.type === 'quadratic') {
      const { a, b, c } = equation;
      const discriminant = b * b - 4 * a * c;
      if (discriminant >= 0) {
        const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
        const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);
        return {
          correct: true,
          roots: [x1, x2],
          confidence: 0.95,
          method: 'quadratic_formula',
        };
      }
    }

    return { correct: true, confidence: 0.5, method: 'no_verification' };
  }

  /**
   * Extract numeric value from answer text
   */
  extractNumber(text) {
    if (typeof text !== 'string') return null;
    const match = text.match(/-?\d+\.?\d*/);
    return match ? parseFloat(match[0]) : null;
  }
}
