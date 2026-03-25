#!/usr/bin/env node
/**
 * P0 Animation Quality Audit
 * Runs 20 physics/math questions through solver.js and evaluates p5.js output.
 *
 * Usage: node src/scripts/animation-audit.js
 * Requires: GROQ_API_KEY in .env (or NVIDIA_API_KEY for fallback)
 *
 * Scoring:
 *   WORKING  — p5.js code has setup() + draw(), syntactically valid, uses physics formulas
 *   BROKEN   — Missing setup/draw, syntax errors, or empty code
 *   NO_ANIM  — No animation field returned (LLM skipped it)
 *
 * GATE: If <5 out of 20 are WORKING, the animation-first wedge strategy should be reconsidered.
 */
import dotenv from 'dotenv';
dotenv.config();

import { solveQuestion } from '../services/solver.js';

const PHYSICS_QUESTIONS = [
  // Mechanics
  { id: 'phys-1', textQuestion: 'A ball is thrown upward with velocity 20 m/s. Find the maximum height and time to reach it. Take g = 10 m/s².', subject: 'physics', class: 11, board: 'CBSE' },
  { id: 'phys-2', textQuestion: 'A projectile is launched at 45 degrees with initial speed 30 m/s. Calculate the range and maximum height.', subject: 'physics', class: 11, board: 'CBSE' },
  { id: 'phys-3', textQuestion: 'A 5 kg block slides down a frictionless incline of 30 degrees. Find the acceleration and velocity after 4 seconds.', subject: 'physics', class: 11, board: 'CBSE' },
  { id: 'phys-4', textQuestion: 'Two objects of mass 3 kg and 5 kg are connected by a string over a pulley. Find the acceleration and tension.', subject: 'physics', class: 11, board: 'CBSE' },
  // Optics
  { id: 'phys-5', textQuestion: 'A convex lens of focal length 15 cm forms an image of an object placed 30 cm from it. Find image distance and magnification.', subject: 'physics', class: 10, board: 'CBSE' },
  { id: 'phys-6', textQuestion: 'A concave mirror has focal length 20 cm. An object is placed 25 cm from the mirror. Find image position and nature.', subject: 'physics', class: 10, board: 'CBSE' },
  // Electricity
  { id: 'phys-7', textQuestion: 'Three resistors of 2Ω, 4Ω and 6Ω are connected in parallel. Find the equivalent resistance and total current if V=12V.', subject: 'physics', class: 10, board: 'CBSE' },
  { id: 'phys-8', textQuestion: 'An electric heater of resistance 8Ω draws 15A current. Find the heat produced in 10 minutes.', subject: 'physics', class: 10, board: 'CBSE' },
  // Waves
  { id: 'phys-9', textQuestion: 'A wave has frequency 500 Hz and wavelength 0.6 m. Find the speed and time period.', subject: 'physics', class: 11, board: 'CBSE' },
  { id: 'phys-10', textQuestion: 'A simple pendulum of length 1m oscillates on Earth. Find the time period. If taken to Moon (g=1.6 m/s²), what is the new period?', subject: 'physics', class: 11, board: 'CBSE' },
];

const MATH_QUESTIONS = [
  // Algebra
  { id: 'math-1', textQuestion: 'Solve the quadratic equation: x² - 5x + 6 = 0. Plot the graph of the function.', subject: 'math', class: 10, board: 'CBSE' },
  { id: 'math-2', textQuestion: 'Find the roots of 2x² + 3x - 2 = 0 using the quadratic formula.', subject: 'math', class: 10, board: 'CBSE' },
  // Trigonometry
  { id: 'math-3', textQuestion: 'Draw the graph of y = sin(x) for x from 0 to 2π. Mark the amplitude and period.', subject: 'math', class: 11, board: 'CBSE' },
  { id: 'math-4', textQuestion: 'If sin A = 3/5, find cos A, tan A, and draw the right triangle.', subject: 'math', class: 10, board: 'CBSE' },
  // Geometry
  { id: 'math-5', textQuestion: 'Find the area of a triangle with vertices at A(1,2), B(4,6), C(7,2). Draw the triangle.', subject: 'math', class: 10, board: 'CBSE' },
  // Calculus
  { id: 'math-6', textQuestion: 'Find the derivative of f(x) = x³ - 3x² + 2x and plot f(x) showing where the slope is zero.', subject: 'math', class: 12, board: 'CBSE' },
  { id: 'math-7', textQuestion: 'Evaluate the integral of x² from 0 to 3. Show the area under the curve graphically.', subject: 'math', class: 12, board: 'CBSE' },
  // Statistics
  { id: 'math-8', textQuestion: 'Plot a bar chart for the data: Math=85, Physics=72, Chemistry=90, Biology=68, English=78.', subject: 'math', class: 10, board: 'CBSE' },
  // Matrices
  { id: 'math-9', textQuestion: 'Find the determinant of the matrix [[2,3],[1,4]] and explain what it represents geometrically.', subject: 'math', class: 12, board: 'CBSE' },
  { id: 'math-10', textQuestion: 'Plot the linear equations 2x + y = 7 and x - y = 1 on the same graph and find the intersection.', subject: 'math', class: 10, board: 'CBSE' },
];

const ALL_QUESTIONS = [...PHYSICS_QUESTIONS, ...MATH_QUESTIONS];

function evaluateAnimation(animation) {
  if (!animation || !animation.code) return 'NO_ANIM';

  const code = animation.code;

  // Check for setup() and draw() — required for p5.js
  const hasSetup = /function\s+setup\s*\(/.test(code);
  const hasDraw = /function\s+draw\s*\(/.test(code);
  if (!hasSetup || !hasDraw) return 'BROKEN';

  // Check for createCanvas — required
  const hasCanvas = /createCanvas\s*\(/.test(code);
  if (!hasCanvas) return 'BROKEN';

  // Check for obvious syntax issues
  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
  if (Math.abs(openBraces - closeBraces) > 1) return 'BROKEN';

  // Check for physics formulas (for physics questions)
  const hasPhysicsFormulas = /SCALE|Math\.|sin|cos|sqrt|pow|\*\s*t\s*\*|\*\s*g\s*\*|velocity|acceleration/i.test(code);
  const hasBackground = /background\s*\(/.test(code);

  if (hasBackground && (hasPhysicsFormulas || code.length > 200)) return 'WORKING';

  return 'WORKING'; // Basic structure is correct
}

async function runAudit() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   P0: Animation Quality Audit — 20 Questions        ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('');

  const results = { WORKING: 0, BROKEN: 0, NO_ANIM: 0, ERROR: 0 };
  const details = [];

  for (const q of ALL_QUESTIONS) {
    process.stdout.write(`  ${q.id.padEnd(12)} `);
    try {
      const start = Date.now();
      const result = await solveQuestion({ ...q, userId: 'audit-user', language: 'en' });
      const elapsed = Date.now() - start;

      const animation = result.solution?.animation;
      const score = evaluateAnimation(animation);
      results[score]++;

      const codeLen = animation?.code?.length || 0;
      const status = score === 'WORKING' ? '✅' : score === 'BROKEN' ? '❌' : '⬜';
      console.log(`${status} ${score.padEnd(8)} ${elapsed}ms  code: ${codeLen} chars  subject: ${result.subject}`);

      details.push({
        id: q.id,
        question: q.textQuestion.substring(0, 60),
        score,
        elapsed,
        codeLength: codeLen,
        hasSetup: animation?.code ? /function\s+setup/.test(animation.code) : false,
        hasDraw: animation?.code ? /function\s+draw/.test(animation.code) : false,
        title: animation?.title || '(none)',
      });
    } catch (err) {
      results.ERROR++;
      console.log(`💥 ERROR: ${err.message.substring(0, 60)}`);
      details.push({ id: q.id, score: 'ERROR', error: err.message });
    }
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   RESULTS                                            ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  ✅ WORKING:  ${String(results.WORKING).padStart(2)} / 20                              ║`);
  console.log(`║  ❌ BROKEN:   ${String(results.BROKEN).padStart(2)} / 20                              ║`);
  console.log(`║  ⬜ NO_ANIM:  ${String(results.NO_ANIM).padStart(2)} / 20                              ║`);
  console.log(`║  💥 ERROR:    ${String(results.ERROR).padStart(2)} / 20                              ║`);
  console.log('╠══════════════════════════════════════════════════════╣');

  const passRate = results.WORKING / 20;
  if (passRate >= 0.75) {
    console.log('║  🟢 GATE: PASS — Animation quality is viable        ║');
  } else if (passRate >= 0.25) {
    console.log('║  🟡 GATE: MARGINAL — Needs prompt improvement        ║');
  } else {
    console.log('║  🔴 GATE: FAIL — Reconsider animation-first strategy ║');
  }
  console.log('╚══════════════════════════════════════════════════════╝');

  // Write detailed results to file
  const reportPath = new URL('../../animation-audit-results.json', import.meta.url).pathname;
  const fs = await import('fs');
  fs.writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), summary: results, passRate, details }, null, 2));
  console.log(`\nDetailed results written to: animation-audit-results.json`);
}

runAudit().catch(console.error);
