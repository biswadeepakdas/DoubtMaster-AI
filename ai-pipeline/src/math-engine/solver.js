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
    // Normalize whitespace
    const normalized = text.replace(/\s+/g, ' ').trim();

    // Quadratic: ax² + bx + c = 0 (check quadratic BEFORE linear to avoid false matches)
    // Handles: x², x^2, x2 and optional coefficients with +/- signs
    const quadMatch = normalized.match(
      /(-?\d*)\s*x\s*[²^]\s*2?\s*([+-]\s*\d*)\s*x\s*([+-]\s*\d+)\s*=\s*0/
    );
    if (quadMatch) {
      return {
        type: 'quadratic',
        a: this.parseCoefficient(quadMatch[1], 1),
        b: this.parseCoefficient(quadMatch[2], 1),
        c: this.parseCoefficient(quadMatch[3], 0),
      };
    }

    // Also match quadratic without linear term: ax² + c = 0
    const quadNoLinear = normalized.match(
      /(-?\d*)\s*x\s*[²^]\s*2?\s*([+-]\s*\d+)\s*=\s*0/
    );
    if (quadNoLinear) {
      return {
        type: 'quadratic',
        a: this.parseCoefficient(quadNoLinear[1], 1),
        b: 0,
        c: this.parseCoefficient(quadNoLinear[2], 0),
      };
    }

    // Linear equation: ax + b = c (full form with constant on left)
    const linearMatch = normalized.match(
      /(-?\d*)\s*x\s*([+-]\s*\d+)\s*=\s*(-?\d+(?:\.\d+)?)/
    );
    if (linearMatch) {
      const a = this.parseCoefficient(linearMatch[1], 1);
      const b = this.parseCoefficient(linearMatch[2], 0);
      const c = parseFloat(linearMatch[3]);
      return { type: 'linear', a, b, c };
    }

    // Linear equation without constant: ax = c (e.g., 3x = 9)
    const linearSimple = normalized.match(
      /(-?\d*)\s*x\s*=\s*(-?\d+(?:\.\d+)?)/
    );
    if (linearSimple) {
      const a = this.parseCoefficient(linearSimple[1], 1);
      const c = parseFloat(linearSimple[2]);
      return { type: 'linear', a, b: 0, c };
    }

    return null;
  }

  /**
   * Parse a coefficient string that may be empty, just a sign, or a number.
   * Examples: "" -> defaultVal, "+" -> 1, "-" -> -1, "3" -> 3, "-5" -> -5, "+ 3" -> 3, "- 3" -> -3
   */
  parseCoefficient(str, defaultVal) {
    if (str === undefined || str === null) return defaultVal;
    const cleaned = str.replace(/\s/g, '');
    if (cleaned === '') return defaultVal;
    if (cleaned === '+') return Math.abs(defaultVal) || 1;
    if (cleaned === '-') return -1;
    const val = parseFloat(cleaned);
    return isNaN(val) ? defaultVal : val;
  }

  /**
   * Solve equation and compare with given answer
   */
  solveAndCompare(equation, answer) {
    if (equation.type === 'linear') {
      if (equation.a === 0) {
        return {
          correct: false,
          expected: null,
          given: null,
          confidence: 0.9,
          method: 'degenerate_linear',
          error: 'Coefficient of x is zero',
        };
      }
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
      if (a === 0) {
        // Not actually quadratic, treat as linear: bx + c = 0
        if (b !== 0) {
          const expected = -c / b;
          const answerNum = this.extractNumber(answer);
          return {
            correct: answerNum !== null ? Math.abs(expected - answerNum) < 0.001 : true,
            roots: [expected],
            confidence: 0.95,
            method: 'linear_fallback',
          };
        }
        return { correct: true, confidence: 0.5, method: 'degenerate_quadratic' };
      }
      const discriminant = b * b - 4 * a * c;
      if (discriminant > 0) {
        const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
        const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const answerNum = this.extractNumber(answer);
        // Check if the answer matches either root
        const matchesRoot = answerNum !== null && (
          Math.abs(x1 - answerNum) < 0.001 || Math.abs(x2 - answerNum) < 0.001
        );
        return {
          correct: answerNum !== null ? matchesRoot : true,
          roots: [x1, x2],
          given: answerNum,
          confidence: 0.95,
          method: 'quadratic_formula',
        };
      } else if (discriminant === 0) {
        const x1 = -b / (2 * a);
        return {
          correct: true,
          roots: [x1],
          confidence: 0.95,
          method: 'quadratic_formula_repeated_root',
        };
      } else {
        // Complex roots
        const realPart = -b / (2 * a);
        const imagPart = Math.sqrt(-discriminant) / (2 * a);
        return {
          correct: true,
          roots: [
            { real: realPart, imaginary: imagPart },
            { real: realPart, imaginary: -imagPart },
          ],
          confidence: 0.90,
          method: 'quadratic_formula_complex',
        };
      }
    }

    return { correct: true, confidence: 0.5, method: 'no_verification' };
  }

  /**
   * Extract numeric value from answer text.
   * Handles integers, decimals, fractions (e.g., "1/2"), and negative numbers.
   */
  extractNumber(text) {
    if (typeof text !== 'string') return null;

    // Try fraction first (e.g., "1/2", "-3/4")
    const fractionMatch = text.match(/(-?\d+)\s*\/\s*(-?\d+)/);
    if (fractionMatch) {
      const numerator = parseFloat(fractionMatch[1]);
      const denominator = parseFloat(fractionMatch[2]);
      if (denominator !== 0) return numerator / denominator;
    }

    // Try decimal/integer
    const match = text.match(/-?\d+\.?\d*/);
    return match ? parseFloat(match[0]) : null;
  }
}
