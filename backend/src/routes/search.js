import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { ncertLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// NCERT solution index (in production: Elasticsearch)
const ncertIndex = generateNCERTIndex();

/**
 * GET /api/search/ncert
 * Search NCERT solutions by class, subject, chapter
 */
router.get('/ncert', ncertLimiter, (req, res) => {
  const { class: grade, subject, chapter, exercise, query } = req.query;

  let results = [...ncertIndex];

  if (grade) results = results.filter((r) => r.class === parseInt(grade, 10));
  if (subject) results = results.filter((r) => r.subject === subject);
  if (chapter) results = results.filter((r) => r.chapter === parseInt(chapter, 10));
  if (exercise) results = results.filter((r) => r.exercise === exercise);
  if (query) {
    const q = query.toLowerCase();
    results = results.filter((r) => r.title.toLowerCase().includes(q) || r.topic.toLowerCase().includes(q));
  }

  res.json({
    results: results.slice(0, 20),
    total: results.length,
    filters: { class: grade, subject, chapter, exercise },
  });
});

/**
 * GET /api/search/pyq
 * Search Previous Year Questions
 */
router.get('/pyq', (req, res) => {
  const { exam, year, subject, topic } = req.query;

  const pyqs = [
    { id: 'pyq1', exam: 'JEE_MAIN', year: 2024, subject: 'math', topic: 'Calculus', question: 'Find the integral of sin²x dx', difficulty: 'medium' },
    { id: 'pyq2', exam: 'JEE_MAIN', year: 2024, subject: 'physics', topic: 'Mechanics', question: 'A block of mass 2kg slides on...', difficulty: 'medium' },
    { id: 'pyq3', exam: 'NEET', year: 2024, subject: 'biology', topic: 'Genetics', question: 'In Mendel\'s dihybrid cross...', difficulty: 'easy' },
    { id: 'pyq4', exam: 'JEE_ADVANCED', year: 2024, subject: 'math', topic: 'Algebra', question: 'If the matrix A satisfies...', difficulty: 'hard' },
    { id: 'pyq5', exam: 'NEET', year: 2024, subject: 'chemistry', topic: 'Organic', question: 'Identify the product of...', difficulty: 'medium' },
  ];

  let filtered = [...pyqs];
  if (exam) filtered = filtered.filter((p) => p.exam === exam);
  if (year) filtered = filtered.filter((p) => p.year === parseInt(year, 10));
  if (subject) filtered = filtered.filter((p) => p.subject === subject);
  if (topic) filtered = filtered.filter((p) => p.topic.toLowerCase().includes(topic.toLowerCase()));

  res.json({ results: filtered, total: filtered.length });
});

function generateNCERTIndex() {
  const subjects = ['math', 'physics', 'chemistry', 'biology'];
  const index = [];

  for (let grade = 6; grade <= 12; grade++) {
    for (const subject of subjects) {
      if (subject !== 'math' && grade < 9) continue; // Physics/Chemistry/Bio from Class 9
      const chapterCount = subject === 'math' ? 15 : 12;
      for (let ch = 1; ch <= chapterCount; ch++) {
        index.push({
          id: `ncert_${grade}_${subject}_${ch}`,
          class: grade,
          subject,
          chapter: ch,
          exercise: `${ch}.1`,
          title: `Chapter ${ch} - Exercise ${ch}.1`,
          topic: getTopicName(subject, grade, ch),
          questionCount: Math.floor(Math.random() * 15) + 5,
          hasSolution: true,
        });
      }
    }
  }

  return index;
}

function getTopicName(subject, grade, chapter) {
  const topics = {
    math: ['Number Systems', 'Algebra', 'Geometry', 'Trigonometry', 'Statistics', 'Calculus', 'Probability', 'Mensuration', 'Coordinate Geometry', 'Linear Equations', 'Polynomials', 'Quadratic Equations', 'Arithmetic Progressions', 'Circles', 'Surface Areas'],
    physics: ['Motion', 'Force and Laws', 'Gravitation', 'Work and Energy', 'Sound', 'Light', 'Electricity', 'Magnetic Effects', 'Waves', 'Thermodynamics', 'Optics', 'Modern Physics'],
    chemistry: ['Matter', 'Atoms and Molecules', 'Structure of Atom', 'Chemical Reactions', 'Acids Bases Salts', 'Metals and Non-metals', 'Carbon Compounds', 'Periodic Classification', 'Chemical Bonding', 'States of Matter', 'Electrochemistry', 'Organic Chemistry'],
    biology: ['Life Processes', 'Cell Biology', 'Tissues', 'Diversity in Living', 'Heredity', 'Evolution', 'Human Body', 'Reproduction', 'Ecology', 'Biotechnology', 'Microorganisms', 'Natural Resources'],
  };
  return (topics[subject] || topics.math)[(chapter - 1) % topics[subject].length];
}

export default router;
