/**
 * Curriculum Mapper - Maps questions to Indian curriculum standards
 * Supports: NCERT, CBSE, ICSE, State Boards, JEE, NEET
 */

// NCERT chapter mapping (Class 6-12)
const NCERT_MAP = {
  math: {
    6: ['Knowing Our Numbers', 'Whole Numbers', 'Playing with Numbers', 'Basic Geometrical Ideas', 'Understanding Elementary Shapes', 'Integers', 'Fractions', 'Decimals', 'Data Handling', 'Mensuration', 'Algebra', 'Ratio and Proportion', 'Symmetry', 'Practical Geometry'],
    7: ['Integers', 'Fractions and Decimals', 'Data Handling', 'Simple Equations', 'Lines and Angles', 'The Triangle and its Properties', 'Congruence of Triangles', 'Comparing Quantities', 'Rational Numbers', 'Practical Geometry', 'Perimeter and Area', 'Algebraic Expressions', 'Exponents and Powers', 'Symmetry', 'Visualising Solid Shapes'],
    8: ['Rational Numbers', 'Linear Equations in One Variable', 'Understanding Quadrilaterals', 'Practical Geometry', 'Data Handling', 'Squares and Square Roots', 'Cubes and Cube Roots', 'Comparing Quantities', 'Algebraic Expressions and Identities', 'Visualising Solid Shapes', 'Mensuration', 'Exponents and Powers', 'Direct and Inverse Proportions', 'Factorisation', 'Introduction to Graphs', 'Playing with Numbers'],
    9: ['Number Systems', 'Polynomials', 'Coordinate Geometry', 'Linear Equations in Two Variables', 'Introduction to Euclid\'s Geometry', 'Lines and Angles', 'Triangles', 'Quadrilaterals', 'Areas of Parallelograms and Triangles', 'Circles', 'Constructions', 'Heron\'s Formula', 'Surface Areas and Volumes', 'Statistics', 'Probability'],
    10: ['Real Numbers', 'Polynomials', 'Pair of Linear Equations in Two Variables', 'Quadratic Equations', 'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry', 'Introduction to Trigonometry', 'Some Applications of Trigonometry', 'Circles', 'Constructions', 'Areas Related to Circles', 'Surface Areas and Volumes', 'Statistics', 'Probability'],
    11: ['Sets', 'Relations and Functions', 'Trigonometric Functions', 'Principle of Mathematical Induction', 'Complex Numbers and Quadratic Equations', 'Linear Inequalities', 'Permutations and Combinations', 'Binomial Theorem', 'Sequences and Series', 'Straight Lines', 'Conic Sections', 'Introduction to Three Dimensional Geometry', 'Limits and Derivatives', 'Mathematical Reasoning', 'Statistics', 'Probability'],
    12: ['Relations and Functions', 'Inverse Trigonometric Functions', 'Matrices', 'Determinants', 'Continuity and Differentiability', 'Application of Derivatives', 'Integrals', 'Application of Integrals', 'Differential Equations', 'Vector Algebra', 'Three Dimensional Geometry', 'Linear Programming', 'Probability'],
  },
  physics: {
    9: ['Motion', 'Force and Laws of Motion', 'Gravitation', 'Work and Energy', 'Sound'],
    10: ['Light - Reflection and Refraction', 'Human Eye and Colourful World', 'Electricity', 'Magnetic Effects of Electric Current', 'Sources of Energy'],
    11: ['Physical World', 'Units and Measurements', 'Motion in a Straight Line', 'Motion in a Plane', 'Laws of Motion', 'Work Energy and Power', 'System of Particles and Rotational Motion', 'Gravitation', 'Mechanical Properties of Solids', 'Mechanical Properties of Fluids', 'Thermal Properties of Matter', 'Thermodynamics', 'Kinetic Theory', 'Oscillations', 'Waves'],
    12: ['Electric Charges and Fields', 'Electrostatic Potential and Capacitance', 'Current Electricity', 'Moving Charges and Magnetism', 'Magnetism and Matter', 'Electromagnetic Induction', 'Alternating Current', 'Electromagnetic Waves', 'Ray Optics and Optical Instruments', 'Wave Optics', 'Dual Nature of Radiation and Matter', 'Atoms', 'Nuclei', 'Semiconductor Electronics'],
  },
};

export class CurriculumMapper {
  /**
   * Classify question and map to curriculum
   */
  classify(text, hints = {}) {
    const subject = hints.subject || this.detectSubject(text);
    const topic = this.detectTopic(text, subject);
    const difficulty = this.estimateDifficulty(text, subject);
    const ncertMapping = this.mapToNCERT(text, subject, hints.class);
    const examRelevance = this.detectExamRelevance(text);

    return {
      subject,
      topic,
      difficulty,
      grade: hints.class,
      board: hints.board || 'CBSE',
      ncertChapter: ncertMapping?.chapter,
      ncertClass: ncertMapping?.class,
      examRelevance,
    };
  }

  detectSubject(text) {
    const lower = text.toLowerCase();
    if (/(?:equation|solve.*[=]|integral|derivative|matrix|polynomial|triangle|circle|probability|algebra|geometry|trigonometry|calculus)/i.test(lower)) return 'math';
    if (/(?:force|velocity|acceleration|energy|momentum|circuit|current|resistance|optics|wave|thermo)/i.test(lower)) return 'physics';
    if (/(?:element|compound|reaction|acid|base|organic|molar|periodic|oxidation|bond|ion)/i.test(lower)) return 'chemistry';
    if (/(?:cell|dna|enzyme|photosynthesis|evolution|ecology|anatomy|genetics|species|organ)/i.test(lower)) return 'biology';
    return 'math';
  }

  detectTopic(text, subject) {
    const topicPatterns = {
      math: [
        [/quadratic|x²|ax²/i, 'Quadratic Equations'],
        [/linear|ax\s*\+\s*b/i, 'Linear Equations'],
        [/trigonometr|sin|cos|tan/i, 'Trigonometry'],
        [/integral|∫|integrate/i, 'Integrals'],
        [/derivative|differentiat/i, 'Differentiation'],
        [/matrix|determinant/i, 'Matrices'],
        [/vector/i, 'Vector Algebra'],
        [/probability/i, 'Probability'],
        [/permutation|combination/i, 'Permutations and Combinations'],
        [/circle/i, 'Circles'],
        [/triangle/i, 'Triangles'],
        [/sequence|series|AP|GP/i, 'Sequences and Series'],
      ],
      physics: [
        [/newton|force|friction/i, 'Laws of Motion'],
        [/velocity|acceleration|motion/i, 'Kinematics'],
        [/energy|work|power/i, 'Work Energy and Power'],
        [/electric|current|resistance|ohm/i, 'Electricity'],
        [/magnet/i, 'Magnetism'],
        [/lens|mirror|optic/i, 'Optics'],
        [/wave|frequency|amplitude/i, 'Waves'],
        [/heat|temperature|thermo/i, 'Thermodynamics'],
        [/gravit/i, 'Gravitation'],
      ],
      chemistry: [
        [/organic|alkane|alkene|benzene/i, 'Organic Chemistry'],
        [/acid|base|pH|salt/i, 'Acids Bases and Salts'],
        [/periodic|element/i, 'Periodic Table'],
        [/oxidation|reduction|redox/i, 'Redox Reactions'],
        [/equilibrium/i, 'Chemical Equilibrium'],
        [/electrochemistry|electrolysis/i, 'Electrochemistry'],
        [/bond|ionic|covalent/i, 'Chemical Bonding'],
      ],
      biology: [
        [/cell|mitosis|meiosis/i, 'Cell Biology'],
        [/dna|gene|heredit|mendel/i, 'Genetics'],
        [/ecosystem|ecology|food chain/i, 'Ecology'],
        [/photosynthesis/i, 'Plant Physiology'],
        [/evolution|darwin/i, 'Evolution'],
        [/reproduction/i, 'Reproduction'],
      ],
    };

    const patterns = topicPatterns[subject] || [];
    for (const [pattern, topic] of patterns) {
      if (pattern.test(text)) return topic;
    }
    return 'General';
  }

  estimateDifficulty(text, subject) {
    const lower = text.toLowerCase();
    if (/jee\s*advanced|olympiad|prove\s*that|iit/i.test(lower)) return 'hard';
    if (/jee\s*main|neet|board\s*exam|class\s*1[12]/i.test(lower)) return 'medium';
    if (/ncert|class\s*[6-9]|basic|simple|find the value/i.test(lower)) return 'easy';
    // Heuristic: longer questions tend to be harder
    if (text.length > 200) return 'medium';
    return 'easy';
  }

  mapToNCERT(text, subject, grade) {
    if (!grade || !NCERT_MAP[subject]?.[grade]) return null;

    const chapters = NCERT_MAP[subject][grade];
    const topic = this.detectTopic(text, subject);

    // Find best matching chapter
    for (let i = 0; i < chapters.length; i++) {
      if (chapters[i].toLowerCase().includes(topic.toLowerCase().split(' ')[0])) {
        return { class: grade, chapter: i + 1, chapterName: chapters[i] };
      }
    }

    return { class: grade, chapter: null, chapterName: null };
  }

  detectExamRelevance(text) {
    const exams = [];
    if (/jee\s*main/i.test(text)) exams.push('JEE_MAIN');
    if (/jee\s*advanced|iit/i.test(text)) exams.push('JEE_ADVANCED');
    if (/neet/i.test(text)) exams.push('NEET');
    if (/cbse|board/i.test(text)) exams.push('CBSE_BOARDS');
    if (/icse/i.test(text)) exams.push('ICSE_BOARDS');
    return exams;
  }
}
