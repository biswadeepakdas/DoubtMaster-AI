/**
 * Real PYQ (Previous Year Questions) examples for few-shot prompting.
 * These anchor the LLM to produce exam-accurate questions that match
 * the actual board/competitive exam style, difficulty, and format.
 *
 * Add more examples per subject/board to improve quality.
 */

export const PYQ_EXAMPLES = {
  'math-CBSE-10': [
    {
      id: 'pyq1',
      question: 'If $\\alpha$ and $\\beta$ are the zeroes of the polynomial $x^2 - 5x + 6$, then the value of $\\alpha^2 + \\beta^2$ is:',
      options: ['25', '13', '12', '37'],
      correctAnswer: 'B',
      topic: 'Polynomials',
      difficulty: 'medium',
      source: 'CBSE 2023 Board'
    },
    {
      id: 'pyq2',
      question: 'The pair of linear equations $3x + 4y = 12$ and $6x + 8y = 24$ has:',
      options: ['No solution', 'Unique solution', 'Infinitely many solutions', 'Exactly two solutions'],
      correctAnswer: 'C',
      topic: 'Linear Equations',
      difficulty: 'easy',
      source: 'CBSE 2022 Board'
    },
    {
      id: 'pyq3',
      question: 'If $\\tan\\theta = \\frac{5}{12}$, then the value of $\\frac{\\sin\\theta + \\cos\\theta}{\\sin\\theta - \\cos\\theta}$ is:',
      options: ['$\\frac{17}{7}$', '$-\\frac{17}{7}$', '$\\frac{7}{17}$', '$-\\frac{7}{17}$'],
      correctAnswer: 'B',
      topic: 'Trigonometry',
      difficulty: 'medium',
      source: 'CBSE 2023 Board'
    },
    {
      id: 'pyq4',
      question: 'The distance between the points $(3, -2)$ and $(-1, 2)$ is:',
      options: ['$4\\sqrt{2}$', '$4$', '$2\\sqrt{2}$', '$8$'],
      correctAnswer: 'A',
      topic: 'Coordinate Geometry',
      difficulty: 'easy',
      source: 'CBSE 2022 Board'
    },
    {
      id: 'pyq5',
      question: 'A solid is in the shape of a cone standing on a hemisphere with both their radii being equal to 1 cm and the height of the cone being equal to its radius. The volume of the solid is:',
      options: ['$\\frac{4}{3}\\pi$ cm³', '$\\pi$ cm³', '$\\frac{2}{3}\\pi$ cm³', '$2\\pi$ cm³'],
      correctAnswer: 'B',
      topic: 'Surface Areas and Volumes',
      difficulty: 'hard',
      source: 'CBSE 2023 Board'
    },
  ],

  'math-CBSE-12': [
    {
      id: 'pyq1',
      question: 'If $A = \\begin{bmatrix} 2 & 3 \\\\ 5 & -2 \\end{bmatrix}$, then $A^{-1}$ is equal to:',
      options: [
        '$\\frac{1}{19}\\begin{bmatrix} -2 & -3 \\\\ -5 & 2 \\end{bmatrix}$',
        '$\\frac{1}{19}\\begin{bmatrix} 2 & 3 \\\\ 5 & -2 \\end{bmatrix}$',
        '$\\frac{-1}{19}\\begin{bmatrix} -2 & -3 \\\\ -5 & 2 \\end{bmatrix}$',
        '$\\frac{1}{19}\\begin{bmatrix} -2 & 3 \\\\ 5 & 2 \\end{bmatrix}$'
      ],
      correctAnswer: 'A',
      topic: 'Matrices',
      difficulty: 'medium',
      source: 'CBSE 2023 Board'
    },
    {
      id: 'pyq2',
      question: 'The value of $\\int_0^{\\pi/2} \\log(\\tan x)\\, dx$ is:',
      options: ['$0$', '$1$', '$\\frac{\\pi}{4}$', '$\\frac{\\pi}{2}$'],
      correctAnswer: 'A',
      topic: 'Integrals',
      difficulty: 'hard',
      source: 'CBSE 2022 Board'
    },
    {
      id: 'pyq3',
      question: 'If $f(x) = x^3 - 3x^2 + 3x - 100$, then $f\'(x)$ is:',
      options: ['Always increasing', 'Always decreasing', 'Constant', 'Neither increasing nor decreasing'],
      correctAnswer: 'A',
      topic: 'Derivatives',
      difficulty: 'medium',
      source: 'CBSE 2023 Board'
    },
  ],

  'physics-CBSE-12': [
    {
      id: 'pyq1',
      question: 'Two point charges $+3\\mu C$ and $+3\\mu C$ are placed 20 cm apart. The magnitude of electric field at the midpoint is:',
      options: ['$0$ N/C', '$5.4 \\times 10^6$ N/C', '$2.7 \\times 10^6$ N/C', '$10.8 \\times 10^6$ N/C'],
      correctAnswer: 'A',
      topic: 'Electrostatics',
      difficulty: 'medium',
      source: 'CBSE 2023 Board'
    },
    {
      id: 'pyq2',
      question: 'A convex lens of focal length 20 cm produces a real image of the same size as the object. The distance of the object from the lens is:',
      options: ['10 cm', '20 cm', '40 cm', '30 cm'],
      correctAnswer: 'C',
      topic: 'Optics',
      difficulty: 'easy',
      source: 'CBSE 2022 Board'
    },
    {
      id: 'pyq3',
      question: 'The de-Broglie wavelength associated with an electron accelerated through a potential difference of 100 V is approximately:',
      options: ['$0.123$ nm', '$1.23$ nm', '$12.3$ nm', '$0.0123$ nm'],
      correctAnswer: 'A',
      topic: 'Dual Nature of Matter',
      difficulty: 'hard',
      source: 'CBSE 2023 Board'
    },
  ],

  'chemistry-CBSE-12': [
    {
      id: 'pyq1',
      question: 'Which of the following is the most stable carbocation?',
      options: ['$(CH_3)_3C^+$', '$(CH_3)_2CH^+$', '$CH_3CH_2^+$', '$CH_3^+$'],
      correctAnswer: 'A',
      topic: 'Organic Chemistry',
      difficulty: 'easy',
      source: 'CBSE 2023 Board'
    },
    {
      id: 'pyq2',
      question: 'The molar conductivity of 0.025 mol/L methanoic acid is $46.1$ S cm² mol⁻¹. Its degree of dissociation ($\\alpha$) and dissociation constant are: (Given: $\\Lambda^0_{H^+} = 349.6$, $\\Lambda^0_{HCOO^-} = 54.6$ S cm² mol⁻¹)',
      options: ['$\\alpha = 0.114$, $K_a = 3.67 \\times 10^{-4}$', '$\\alpha = 0.214$, $K_a = 1.46 \\times 10^{-3}$', '$\\alpha = 0.314$, $K_a = 3.59 \\times 10^{-3}$', '$\\alpha = 0.414$, $K_a = 7.32 \\times 10^{-3}$'],
      correctAnswer: 'A',
      topic: 'Electrochemistry',
      difficulty: 'hard',
      source: 'CBSE 2022 Board'
    },
  ],

  'biology-CBSE-12': [
    {
      id: 'pyq1',
      question: 'In a monohybrid cross between two heterozygous parents, the ratio of genotypes in F2 generation is:',
      options: ['1:2:1', '3:1', '1:1', '9:3:3:1'],
      correctAnswer: 'A',
      topic: 'Genetics',
      difficulty: 'easy',
      source: 'CBSE 2023 Board'
    },
    {
      id: 'pyq2',
      question: 'Which of the following is NOT a method of ex-situ conservation?',
      options: ['Botanical gardens', 'Wildlife sanctuaries', 'Seed banks', 'Zoological parks'],
      correctAnswer: 'B',
      topic: 'Biodiversity and Conservation',
      difficulty: 'medium',
      source: 'CBSE 2022 Board'
    },
    {
      id: 'pyq3',
      question: 'The process of sewage treatment in which anaerobic digestion of organic waste occurs is:',
      options: ['Primary treatment', 'Secondary treatment', 'Tertiary treatment', 'Preliminary treatment'],
      correctAnswer: 'B',
      topic: 'Environmental Issues',
      difficulty: 'medium',
      source: 'CBSE 2023 Board'
    },
  ],

  'physics-JEE-12': [
    {
      id: 'pyq1',
      question: 'A particle moves in a circle of radius $R$ with constant speed $v$. The magnitude of its average velocity in half revolution is:',
      options: ['$\\frac{2v}{\\pi}$', '$\\frac{v}{\\pi}$', '$v$', '$\\frac{v}{2}$'],
      correctAnswer: 'A',
      topic: 'Circular Motion',
      difficulty: 'medium',
      source: 'JEE Main 2023'
    },
    {
      id: 'pyq2',
      question: 'Two identical springs of spring constant $k$ are connected in parallel. The equivalent spring constant is:',
      options: ['$k/2$', '$k$', '$2k$', '$4k$'],
      correctAnswer: 'C',
      topic: 'Simple Harmonic Motion',
      difficulty: 'easy',
      source: 'JEE Main 2022'
    },
    {
      id: 'pyq3',
      question: 'A body is projected vertically upwards. The times corresponding to height $h$ while ascending and descending are $t_1$ and $t_2$ respectively. The velocity of projection is (take $g = 10$ m/s²):',
      options: ['$g\\sqrt{t_1 t_2}$', '$\\frac{g(t_1 + t_2)}{2}$', '$g\\frac{t_1 t_2}{t_1 + t_2}$', '$\\frac{g(t_1 - t_2)}{2}$'],
      correctAnswer: 'B',
      topic: 'Kinematics',
      difficulty: 'hard',
      source: 'JEE Main 2023'
    },
  ],

  'math-JEE-12': [
    {
      id: 'pyq1',
      question: 'If $z = x + iy$ and $|z - 1| = |z + 1|$, then the locus of $z$ is:',
      options: ['$x = 0$', '$y = 0$', '$x = 1$', '$y = 1$'],
      correctAnswer: 'A',
      topic: 'Complex Numbers',
      difficulty: 'medium',
      source: 'JEE Main 2023'
    },
    {
      id: 'pyq2',
      question: 'The number of ways in which 5 boys and 3 girls can be seated in a row so that each girl is between 2 boys is:',
      options: ['2880', '1440', '720', '4320'],
      correctAnswer: 'A',
      topic: 'Permutations and Combinations',
      difficulty: 'hard',
      source: 'JEE Main 2022'
    },
    {
      id: 'pyq3',
      question: 'The area enclosed by the curve $y = x^2$, the x-axis, and the lines $x = 1$ and $x = 3$ is:',
      options: ['$\\frac{26}{3}$ sq. units', '$\\frac{13}{3}$ sq. units', '$\\frac{8}{3}$ sq. units', '$9$ sq. units'],
      correctAnswer: 'A',
      topic: 'Definite Integrals',
      difficulty: 'medium',
      source: 'JEE Main 2023'
    },
  ],
};

/**
 * Get PYQ examples for a given subject-board-class combination.
 * Returns formatted string for few-shot prompting.
 */
export function getPYQExamples(subject, board, classLevel) {
  const key = `${subject}-${board}-${classLevel}`;
  const examples = PYQ_EXAMPLES[key];

  if (!examples || examples.length === 0) {
    // Try broader match (subject-board only)
    const broadKey = Object.keys(PYQ_EXAMPLES).find(k => k.startsWith(`${subject}-${board}`));
    if (broadKey) return formatExamples(PYQ_EXAMPLES[broadKey]);

    // Try subject only
    const subjectKey = Object.keys(PYQ_EXAMPLES).find(k => k.startsWith(`${subject}-`));
    if (subjectKey) return formatExamples(PYQ_EXAMPLES[subjectKey]);

    return '';
  }

  return formatExamples(examples);
}

function formatExamples(examples) {
  return `\n\nHere are REAL previous year questions from actual board/competitive exams. Use these as reference for style, difficulty, and format. Your generated questions MUST match this quality:\n\n${JSON.stringify({ questions: examples }, null, 2)}\n\nGenerate NEW questions that are DIFFERENT from the examples above but match the same style, difficulty distribution, and format. Include questions from various topics/chapters.`;
}
