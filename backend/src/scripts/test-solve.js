#!/usr/bin/env node
/**
 * End-to-end test: Text question → Sarvam AI solve → Step-by-step response
 *
 * Usage: node src/scripts/test-solve.js
 * Requires: NVIDIA_API_KEY in .env
 */
import dotenv from 'dotenv';
dotenv.config();

import { solveQuestion } from '../services/solver.js';

const TEST_QUESTIONS = [
  {
    id: 'test-math-1',
    textQuestion: 'Solve the quadratic equation: 2x² + 5x - 3 = 0',
    subject: 'math',
    class: 10,
    board: 'CBSE',
    language: 'en',
  },
  {
    id: 'test-physics-1',
    textQuestion: 'A car accelerates from rest at 2 m/s² for 10 seconds. What is the final velocity and distance covered?',
    subject: 'physics',
    class: 11,
    board: 'CBSE',
    language: 'en',
  },
  {
    id: 'test-hindi-1',
    textQuestion: 'द्विघात समीकरण x² - 7x + 12 = 0 को हल करें',
    subject: 'math',
    class: 10,
    board: 'CBSE',
    language: 'hi',
  },
];

async function runTest() {
  console.log('=== DoubtMaster AI — End-to-End Solve Test ===\n');

  for (const q of TEST_QUESTIONS) {
    console.log(`\n--- Test: ${q.id} ---`);
    console.log(`Question: ${q.textQuestion}`);
    console.log(`Subject: ${q.subject} | Class: ${q.class} | Board: ${q.board} | Language: ${q.language}\n`);

    try {
      const start = Date.now();
      const result = await solveQuestion({ ...q, userId: 'test-user' });
      const elapsed = Date.now() - start;

      console.log(`Model: ${result.modelUsed}`);
      console.log(`Subject detected: ${result.subject} (${result.topic})`);
      console.log(`Difficulty: ${result.difficulty}`);
      console.log(`Confidence: ${result.confidence}`);
      console.log(`Time: ${elapsed}ms\n`);

      console.log('Steps:');
      for (const step of result.solution.steps) {
        console.log(`  ${step.stepNumber || step.step_number}. ${step.title}`);
        console.log(`     ${(step.content || step.work || '').substring(0, 120)}`);
        if (step.explanation) console.log(`     → ${step.explanation.substring(0, 100)}`);
      }

      console.log(`\nFinal Answer: ${result.solution.finalAnswer}`);
      console.log(`Concept Tags: ${(result.solution.conceptTags || []).join(', ')}`);
      if (result.solution.alternativeMethod) {
        console.log(`Alt Method: ${result.solution.alternativeMethod}`);
      }
      console.log(`\n✓ PASSED`);
    } catch (error) {
      console.error(`✗ FAILED: ${error.message}`);
    }
  }

  console.log('\n=== Test Complete ===');
}

runTest().catch(console.error);
