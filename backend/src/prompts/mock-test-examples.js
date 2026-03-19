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

  // ===== 2025 BOARD PAPER QUESTIONS (Latest) =====

  'science-CBSE-10': [
    {
      id: '2025-sci-1', question: 'Which of the following is the correct electron dot structure of H₂O?',
      options: ['H:O:H with 2 lone pairs on O', 'H-O-H linear', 'H:O:H with no lone pairs', 'O with 3 bonds to H'],
      correctAnswer: 'A', topic: 'Chemical Bonding', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-sci-2', question: 'A concave mirror produces a magnified, virtual and erect image. The object is placed:',
      options: ['At the centre of curvature', 'Between the pole and focus', 'Beyond the centre of curvature', 'At infinity'],
      correctAnswer: 'B', topic: 'Light - Reflection', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-sci-3', question: 'The SI unit of electric current is:',
      options: ['Volt', 'Ohm', 'Ampere', 'Watt'],
      correctAnswer: 'C', topic: 'Electricity', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-sci-4', question: 'Which of the following is a plant hormone that promotes growth?',
      options: ['Abscisic acid', 'Auxin', 'Ethylene', 'Cytokinin'],
      correctAnswer: 'B', topic: 'Control and Coordination', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-sci-5', question: 'In the reaction $\\text{Zn} + \\text{CuSO}_4 \\rightarrow \\text{ZnSO}_4 + \\text{Cu}$, which substance is oxidised?',
      options: ['Cu', 'Zn', '$\\text{CuSO}_4$', '$\\text{ZnSO}_4$'],
      correctAnswer: 'B', topic: 'Chemical Reactions', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-sci-6', question: 'The human excretory system consists of a pair of kidneys, a pair of ureters, a urinary bladder and a urethra. The functional unit of kidney is:',
      options: ['Neuron', 'Nephron', 'Glomerulus', 'Bowman\'s capsule'],
      correctAnswer: 'B', topic: 'Life Processes', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-sci-7', question: 'The power of a lens of focal length 25 cm is:',
      options: ['+4 D', '-4 D', '+0.25 D', '-0.25 D'],
      correctAnswer: 'A', topic: 'Light - Refraction', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-sci-8', question: 'Assertion (A): Carbon forms covalent compounds. Reason (R): Carbon has 4 valence electrons and can share electrons to complete its octet.',
      options: ['Both A and R are true and R is the correct explanation of A', 'Both A and R are true but R is not the correct explanation of A', 'A is true but R is false', 'A is false but R is true'],
      correctAnswer: 'A', topic: 'Carbon and its Compounds', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
  ],

  'chemistry-CBSE-12-2025': [
    {
      id: '2025-chem-1', question: 'Which is a colligative property?',
      options: ['Surface tension', 'Osmotic pressure', 'Viscosity', 'Density'],
      correctAnswer: 'B', topic: 'Solutions', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-chem-2', question: 'What is the unit of molality?',
      options: ['mol/L', 'mol/kg', 'g/L', 'kg/mol'],
      correctAnswer: 'B', topic: 'Solutions', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-chem-3', question: 'Which law governs gas solubility in liquids?',
      options: ['Henry\'s law', 'Raoult\'s law', 'Dalton\'s law', 'Boyle\'s law'],
      correctAnswer: 'A', topic: 'Solutions', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-chem-4', question: 'The Van\'t Hoff factor for $\\text{K}_2\\text{SO}_4$ completely dissociated in water is:',
      options: ['1', '2', '3', '4'],
      correctAnswer: 'C', topic: 'Colligative Properties', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-chem-5', question: 'In a galvanic cell, electrons flow from:',
      options: ['Cathode to anode', 'Anode to cathode', 'Salt bridge', 'Electrolyte to electrode'],
      correctAnswer: 'B', topic: 'Electrochemistry', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-chem-6', question: 'The standard electrode potential of hydrogen electrode is:',
      options: ['0.00 V', '1.00 V', '-0.76 V', '0.34 V'],
      correctAnswer: 'A', topic: 'Electrochemistry', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-chem-7', question: 'Which electrolyte is used in dry cells?',
      options: ['$\\text{H}_2\\text{SO}_4$', 'KOH', '$\\text{NH}_4\\text{Cl}$', 'NaOH'],
      correctAnswer: 'C', topic: 'Electrochemistry', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-chem-8', question: 'The unit of rate constant for a first-order reaction is:',
      options: ['$\\text{s}^{-1}$', '$\\text{mol L}^{-1}\\text{s}^{-1}$', '$\\text{L mol}^{-1}\\text{s}^{-1}$', '$\\text{L}^2\\text{mol}^{-2}\\text{s}^{-1}$'],
      correctAnswer: 'A', topic: 'Chemical Kinetics', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-chem-9', question: 'Half-life of a first-order reaction is:',
      options: ['Proportional to initial concentration', 'Independent of initial concentration', 'Inversely proportional to initial concentration', 'Depends on pressure'],
      correctAnswer: 'B', topic: 'Chemical Kinetics', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-chem-10', question: 'Activation energy is the:',
      options: ['Minimum energy required for a reaction to occur', 'Maximum energy required', 'Energy of reactants', 'Energy of products'],
      correctAnswer: 'A', topic: 'Chemical Kinetics', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
  ],

  'physics-CBSE-12-2025': [
    {
      id: '2025-phy-1', question: 'In an n-type semiconductor, the majority charge carriers are:',
      options: ['Holes', 'Electrons', 'Protons', 'Neutrons'],
      correctAnswer: 'B', topic: 'Semiconductor Electronics', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-phy-2', question: 'The drift velocity of electrons in a conductor increases with:',
      options: ['Decrease in electric field', 'Increase in electric field', 'Increase in temperature', 'Decrease in length'],
      correctAnswer: 'B', topic: 'Current Electricity', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-phy-3', question: 'In Young\'s double-slit experiment, if the slit separation is halved and the distance between the screen and slits is doubled, the fringe width becomes:',
      options: ['Half', 'Double', 'Four times', 'Unchanged'],
      correctAnswer: 'C', topic: 'Wave Optics', difficulty: 'hard', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-phy-4', question: 'The energy of a photon of wavelength $\\lambda$ is (where $h$ is Planck\'s constant and $c$ is speed of light):',
      options: ['$h\\lambda/c$', '$hc/\\lambda$', '$h/c\\lambda$', '$c/h\\lambda$'],
      correctAnswer: 'B', topic: 'Dual Nature of Radiation', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-phy-5', question: 'The ratio of nuclear density to atomic density is approximately:',
      options: ['$10^3$', '$10^6$', '$10^{13}$', '$10^{15}$'],
      correctAnswer: 'C', topic: 'Nuclei', difficulty: 'hard', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-phy-6', question: 'A parallel plate capacitor with air as medium has capacitance $C$. If a dielectric of constant $K$ is introduced between the plates, the new capacitance becomes:',
      options: ['$C/K$', '$KC$', '$C + K$', '$C - K$'],
      correctAnswer: 'B', topic: 'Electrostatics', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-phy-7', question: 'The magnetic field at the centre of a circular current-carrying coil of radius $r$ with $N$ turns carrying current $I$ is:',
      options: ['$\\mu_0 NI / 2r$', '$\\mu_0 NI / r$', '$\\mu_0 I / 2Nr$', '$\\mu_0 I / 2\\pi r$'],
      correctAnswer: 'A', topic: 'Moving Charges and Magnetism', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-phy-8', question: 'Assertion (A): In nuclear fission, the sum of masses of fragments is less than the mass of the parent nucleus. Reason (R): The difference in mass appears as energy according to $E = mc^2$.',
      options: ['Both A and R are true and R is the correct explanation of A', 'Both A and R are true but R is not the correct explanation of A', 'A is true but R is false', 'A is false but R is true'],
      correctAnswer: 'A', topic: 'Nuclei', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
  ],

  'biology-CBSE-12-2025': [
    {
      id: '2025-bio-1', question: 'The process of formation of sperms in males is called:',
      options: ['Oogenesis', 'Spermatogenesis', 'Gametogenesis', 'Embryogenesis'],
      correctAnswer: 'B', topic: 'Human Reproduction', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-bio-2', question: 'Which of the following is an example of ex-situ conservation?',
      options: ['National Park', 'Wildlife Sanctuary', 'Biosphere Reserve', 'Seed Bank'],
      correctAnswer: 'D', topic: 'Biodiversity and Conservation', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-bio-3', question: 'The technique used to separate DNA fragments is:',
      options: ['Centrifugation', 'Gel electrophoresis', 'PCR', 'Chromatography'],
      correctAnswer: 'B', topic: 'Biotechnology', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-bio-4', question: 'In Mendel\'s dihybrid cross, the phenotypic ratio in F2 generation is:',
      options: ['1:2:1', '3:1', '9:3:3:1', '1:1:1:1'],
      correctAnswer: 'C', topic: 'Principles of Inheritance', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-bio-5', question: 'Which of the following diseases is caused by a protozoan?',
      options: ['Typhoid', 'Malaria', 'Ringworm', 'Common cold'],
      correctAnswer: 'B', topic: 'Human Health and Disease', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-bio-6', question: 'The primary productivity of an ecosystem depends on:',
      options: ['Only light', 'Light and temperature', 'Light, temperature, and nutrient availability', 'Only water availability'],
      correctAnswer: 'C', topic: 'Ecosystem', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-bio-7', question: 'Restriction enzymes are used in genetic engineering to:',
      options: ['Join DNA fragments', 'Cut DNA at specific sites', 'Amplify DNA', 'Translate mRNA'],
      correctAnswer: 'B', topic: 'Biotechnology - Principles', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-bio-8', question: 'Assertion (A): Amniocentesis is banned in India. Reason (R): It was being misused for sex determination of the foetus.',
      options: ['Both A and R are true and R is the correct explanation of A', 'Both A and R are true but R is not the correct explanation of A', 'A is true but R is false', 'A is false but R is true'],
      correctAnswer: 'A', topic: 'Reproductive Health', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
  ],

  'math-CBSE-10-2025': [
    {
      id: '2025-m10-1', question: 'If $\\alpha$ and $\\beta$ are the zeroes of the polynomial $p(x) = 2x^2 - 5x + 3$, then $\\alpha + \\beta$ is:',
      options: ['$\\frac{5}{2}$', '$\\frac{3}{2}$', '$\\frac{-5}{2}$', '$\\frac{-3}{2}$'],
      correctAnswer: 'A', topic: 'Polynomials', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-m10-2', question: 'If PA and PB are tangents to a circle with centre O such that $\\angle APB = 90°$ and $AB = 3\\sqrt{2}$ cm, then the diameter of the circle is:',
      options: ['$3\\sqrt{2}$ cm', '$6\\sqrt{2}$ cm', '3 cm', '6 cm'],
      correctAnswer: 'D', topic: 'Circles', difficulty: 'hard', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-m10-3', question: 'If the mode of some observations is 10 and sum of mean and median is 25, then the mean and median respectively are:',
      options: ['12 and 13', '13 and 12', '10 and 15', '15 and 10'],
      correctAnswer: 'B', topic: 'Statistics', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-m10-4', question: 'The HCF of 12, 21 and 15 is:',
      options: ['3', '4', '5', '6'],
      correctAnswer: 'A', topic: 'Real Numbers', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-m10-5', question: 'The distance between the points $A(2, -3)$ and $B(-2, 3)$ is:',
      options: ['$2\\sqrt{13}$', '$4\\sqrt{13}$', '$4\\sqrt{2}$', '$2\\sqrt{10}$'],
      correctAnswer: 'A', topic: 'Coordinate Geometry', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-m10-6', question: 'If $\\sin\\theta = \\frac{3}{5}$, then $\\cos\\theta$ is:',
      options: ['$\\frac{4}{5}$', '$\\frac{3}{4}$', '$\\frac{5}{3}$', '$\\frac{5}{4}$'],
      correctAnswer: 'A', topic: 'Trigonometry', difficulty: 'easy', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-m10-7', question: 'The sum of first 20 terms of an A.P. whose first term is 5 and common difference is 4 is:',
      options: ['860', '820', '760', '750'],
      correctAnswer: 'A', topic: 'Arithmetic Progressions', difficulty: 'medium', source: 'CBSE 2025 Board'
    },
    {
      id: '2025-m10-8', question: 'A card is drawn at random from a well-shuffled deck of 52 cards. The probability of getting a face card is:',
      options: ['$\\frac{1}{13}$', '$\\frac{3}{13}$', '$\\frac{4}{13}$', '$\\frac{1}{4}$'],
      correctAnswer: 'B', topic: 'Probability', difficulty: 'easy', source: 'CBSE 2025 Board'
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
