# MASTER PROMPT — DoubtMaster AI (Best of Both Worlds)

> This prompt merges the **business strategy depth** of DoubtMaster AI
> with the **engineering precision** of HomeworkAI. It is the definitive
> spec for building India's #1 AI homework solver.

---

## SECTION 1 — PROJECT IDENTITY

Build a full-stack, mobile-first + web SaaS application called **"DoubtMaster AI"**.

**Tagline:** *"Samjho, Sirf Answer Mat Dekho"* (Understand, Don't Just See the Answer)

DoubtMaster AI is an AI-powered homework solver and learning platform for students in:
- **India:** Classes 1–12 (CBSE, ICSE, Maharashtra Board, Tamil Nadu Board, Karnataka Board, Kerala Board, UP Board, Rajasthan Board, West Bengal Board, AP/Telangana Board)
- **Global (Phase 2):** US Grades K–12 (Common Core, NGSS, AP, State Standards)

The app lets students:
1. Upload homework as **photos (camera/gallery), PDF, or typed text**
2. AI reads, identifies every question, solves each one **step-by-step exactly as schools expect students to show their work**
3. Generates a **downloadable/printable PDF** of complete solutions
4. Students can tap any solved question and get an **"Explain Visually" animated explainer** (3Blue1Brown-style Manim animations)
5. **"Samjho Mode" (Learn Mode)** — hides the final answer until the student demonstrates understanding

---

## SECTION 2 — MARKET STRATEGY (Agents 1–4 + 12)

### 2.1 Phase 1: Deep Research

Before writing any code, research ALL competing homework-solving apps (2025–2026):

**Must analyze (minimum 15 apps):**
Doubtnut (Allen), Photomath (Google), Gauth (ByteDance), Socratic (Google — shut down), BYJU'S (insolvency), Vedantu, Toppr, Brainly, Chegg, Physics Wallah, Question AI (Zuoyebang), StudyX, GeniusTutor, HIX Tutor, HomeworkAI, SmartSolve, PixVeda, Unacademy

**For each app, document in a table:**
| Column | What to capture |
|--------|----------------|
| Status | Active / dying / shut down / acquired |
| Pricing (India) | Free tier limits, premium cost in INR |
| Key features | Top 5 differentiating features |
| Play Store rating | Stars + review count |
| Monthly users (est.) | From SimilarWeb / app intelligence |
| Top 5 weaknesses | From Play Store reviews, Reddit, Quora (India-focused) |
| Exploitable gaps | What we can do better |
| Best features to copy | Worth replicating in our product |

**Deliver:**
1. Competitor Overview Table (all apps)
2. Weakness Exploitation Matrix (every weakness = our opportunity)
3. Dream Feature Matrix (best of every app combined)
4. Market Gap Analysis (post-BYJU'S vacuum, vernacular gap, trust deficit, offline-first need)

### 2.2 Phase 2: Product Strategy

**Pricing (India-first, beat everyone):**

| Tier | Monthly | Annual | Key Features |
|------|---------|--------|-------------|
| **Free (Muft)** | ₹0 forever | ₹0 | Unlimited NCERT solutions (Class 1-12), 20 advanced solves/day, basic progress, Hindi+English |
| **Pro (Topper)** | ₹49 | ₹399 | Unlimited everything, Samjho Mode, offline packs, mock tests, all 11 languages, no ads, animation explainers, PDF export |
| **Pro+ (Champion)** | ₹99 | ₹799 | Pro + live doubt chat, personalized study plan, parent reports, voice input, AR scanner |
| **School** | - | ₹99/student/yr | Teacher dashboard, class analytics, anti-cheat watermarks, LMS integration, assignment creation |

**5 Killer Differentiators (exploit every competitor weakness):**
1. **Unlimited Free NCERT** — No daily limits (beats Gauth's 5/day, Photomath's paywall)
2. **Samjho Mode** — Anti-cheating learning gate (schools endorse us, not ban us)
3. **Visual Animations** — Manim-powered 3Blue1Brown-style explainers (nobody else has this)
4. **< 5 MB App** — Works on ₹5,000 phones with 2GB RAM (beats BYJU'S 200MB+)
5. **11 Indian Languages** — Native, not Google Translated (Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati, Malayalam, Punjabi, Odia, English)

**Go-to-Market: 30-day launch plan** targeting Indian students through:
- Instagram Reels/YouTube Shorts ("Solve any NCERT in 2 seconds")
- Reddit r/JEENEETards, r/CBSE organic presence
- Telegram/WhatsApp study group bots
- Student ambassador program (100 colleges)
- School pilot partnerships (free teacher dashboard)
- ASO: Target "NCERT solutions", "JEE solver", "homework help Hindi"

---

## SECTION 3 — TECHNICAL ARCHITECTURE

### 3.1 File Structure

```
doubtmaster-ai/
├── frontend/
│   ├── mobile/                    # React Native (Expo)
│   │   └── src/
│   │       ├── screens/
│   │       │   ├── HomeScreen.js        # One-tap camera, streak, recent doubts
│   │       │   ├── CameraScreen.js      # Photo capture + gallery + crop
│   │       │   ├── TextSolveScreen.js   # Type question input
│   │       │   ├── SolvingScreen.js     # Live pipeline progress
│   │       │   ├── SolutionScreen.js    # Step-by-step + Samjho Mode gate
│   │       │   ├── AnimationScreen.js   # Manim video player
│   │       │   ├── NCERTBrowser.js      # Class→Subject→Chapter→Exercise
│   │       │   ├── ProgressScreen.js    # Weakness map, streak, charts
│   │       │   ├── MockTestScreen.js    # Timed JEE/NEET mock tests
│   │       │   ├── ProfileScreen.js     # Settings, language, subscription
│   │       │   └── SubscriptionScreen.js # Pricing + Razorpay checkout
│   │       ├── components/
│   │       │   ├── UploadZone.js        # Drag-drop + camera capture
│   │       │   ├── QuestionCard.js      # Single question display
│   │       │   ├── SolutionStep.js      # Step-by-step render with "why"
│   │       │   ├── MathRenderer.js      # KaTeX math rendering
│   │       │   ├── AnimationPlayer.js   # Video player for Manim output
│   │       │   ├── ProgressPipeline.js  # Agent pipeline progress UI
│   │       │   ├── PDFPreview.js        # In-browser PDF viewer
│   │       │   ├── LearnModeGate.js     # Samjho Mode bottom sheet
│   │       │   └── StreakBadge.js       # Streak fire animation
│   │       ├── navigation/
│   │       ├── store/                   # Zustand state management
│   │       ├── services/               # API client + offline cache
│   │       └── i18n/                   # 11-language translations
│   └── web/                       # Next.js 15 App Router
│       └── src/app/
│           ├── layout.js              # Root layout + fonts + theme
│           ├── page.js                # Landing page / hero
│           ├── dashboard/page.js      # Student dashboard
│           ├── upload/page.js         # Upload homework page
│           ├── solving/[id]/page.js   # Live solving progress
│           ├── results/[id]/page.js   # View solutions + animations
│           └── animate/[id]/page.js   # Animated concept explainer
├── backend/                       # Node.js + Express
│   └── src/
│       ├── server.js
│       ├── config/
│       ├── agents/                    # AI agent orchestration
│       │   ├── conductor.js           # Orchestrator agent
│       │   ├── ingestion.js           # OCR + file parsing
│       │   ├── parser.js              # Question identification
│       │   ├── router.js              # Curriculum matching
│       │   ├── solver.js              # Solution generation (THE CORE)
│       │   ├── reviewer.js            # QA verification
│       │   ├── output.js              # PDF generation
│       │   └── animator.js            # Manim animation generation
│       ├── prompts/                   # All agent system prompts as .txt
│       │   ├── conductor.txt
│       │   ├── ingestion.txt
│       │   ├── parser.txt
│       │   ├── router.txt
│       │   ├── solver.txt
│       │   ├── reviewer.txt
│       │   ├── output.txt
│       │   └── animator.txt
│       ├── routes/
│       ├── services/
│       │   ├── ocr.js                 # Tesseract + Cloud Vision
│       │   ├── llm.js                 # Claude/GPT/Gemini API wrapper
│       │   ├── pdfGen.js              # HTML-to-PDF renderer
│       │   ├── animationGen.js        # Manim runner
│       │   ├── storage.js             # S3 file operations
│       │   └── payment.js             # Razorpay + Stripe
│       ├── middleware/
│       └── utils/
├── ai-pipeline/                   # AI/ML processing modules
│   └── src/
│       ├── ocr/                       # Multi-model OCR engine
│       ├── llm/                       # LLM router (cost vs accuracy)
│       ├── math-engine/               # Symbolic math verification
│       ├── curriculum/                # NCERT/JEE/NEET/board mapping
│       └── multilingual/              # 11-language translation engine
├── animations/                    # Manim scenes library
│   ├── math/                          # Algebra, geometry, calculus
│   ├── science/                       # Physics, chemistry, biology
│   └── templates/                     # Reusable animation templates
├── admin-panel/                   # Teacher/school dashboard
├── tests/
│   ├── accuracy/                      # 500-question NCERT benchmark
│   ├── integration/                   # API integration tests
│   └── e2e/                           # End-to-end tests
├── deployment/
│   ├── docker/
│   └── scripts/
└── docs/                          # Strategy + architecture documents
```

### 3.2 Database Schema

```sql
-- Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  name TEXT NOT NULL,
  country TEXT CHECK (country IN ('IN', 'US')) DEFAULT 'IN',
  grade INTEGER CHECK (grade BETWEEN 1 AND 12),
  board TEXT, -- 'CBSE', 'ICSE', 'STATE_MH', 'STATE_TN', 'CommonCore', 'AP', etc.
  preferred_language TEXT DEFAULT 'en',
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free','pro','champion')),
  parent_email TEXT,
  school_name TEXT,
  city TEXT,
  state TEXT,
  target_exam TEXT, -- 'NONE', 'JEE_MAIN', 'JEE_ADVANCED', 'NEET', 'BOARDS'
  streak_current INTEGER DEFAULT 0,
  streak_best INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Homework submissions
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  upload_type TEXT CHECK (upload_type IN ('pdf', 'image', 'text')),
  file_url TEXT,
  raw_extracted_text TEXT,
  detected_subject TEXT,
  detected_grade INTEGER,
  detected_board TEXT,
  detected_language TEXT DEFAULT 'en',
  status TEXT DEFAULT 'uploaded',
  -- status flow: uploaded → ingesting → parsing → routing → solving → reviewing → generating → complete → error
  total_questions INTEGER,
  solved_questions INTEGER DEFAULT 0,
  output_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Individual questions
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id),
  question_number TEXT, -- 'Q1', 'Q2a', etc.
  question_text TEXT NOT NULL,
  question_type TEXT, -- 'solve','explain','prove','derive','mcq','essay','diagram','fill_blank','match_columns','true_false','short_answer','long_answer'
  subject TEXT,
  topic TEXT,
  chapter_ref TEXT, -- 'NCERT Class 10 Math Ch.4'
  marks INTEGER,
  has_figure BOOLEAN DEFAULT false,
  figure_url TEXT,
  language TEXT DEFAULT 'en',
  ncert_mapped BOOLEAN DEFAULT false
);

-- Solutions
CREATE TABLE solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id),
  steps JSONB NOT NULL, -- [{step_number, title, work, explanation, marks_for_step}]
  final_answer TEXT NOT NULL,
  final_answer_latex TEXT,
  formulas_used TEXT[],
  key_concepts TEXT[],
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
  diagram_description TEXT,
  alternate_method TEXT,
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending','pass','fail','warn')),
  review_notes TEXT,
  retry_count INTEGER DEFAULT 0,
  model_used TEXT,
  confidence DECIMAL(3,2),
  solve_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Samjho Mode (Learn Mode) attempts
CREATE TABLE learn_mode_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID REFERENCES solutions(id),
  student_id UUID REFERENCES students(id),
  student_response TEXT NOT NULL,
  ai_score INTEGER CHECK (ai_score BETWEEN 0 AND 100),
  passed BOOLEAN DEFAULT false,
  feedback TEXT,
  hint TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Animation requests
CREATE TABLE animations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id),
  student_id UUID REFERENCES students(id),
  concept TEXT NOT NULL,
  animation_type TEXT CHECK (animation_type IN ('manim','html5','lottie','slides')),
  manim_script TEXT,
  animation_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  narration_text TEXT,
  subtitles JSONB, -- [{time, text}]
  status TEXT DEFAULT 'generating' CHECK (status IN ('generating','complete','failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Progress tracking
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  subject TEXT,
  topic TEXT,
  questions_solved INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2),
  mastery_level TEXT DEFAULT 'beginner',
  last_attempted TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- School/Teacher
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  board TEXT,
  city TEXT,
  state TEXT,
  admin_user_id UUID REFERENCES students(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  teacher_id UUID REFERENCES students(id),
  name TEXT,
  grade INTEGER
);

-- Billing
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  razorpay_subscription_id TEXT,
  stripe_subscription_id TEXT,
  amount INTEGER, -- in paise (INR) or cents (USD)
  currency TEXT DEFAULT 'INR',
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id),
  student_id UUID REFERENCES students(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Auth** | | |
| POST | `/api/auth/register` | Register with phone OTP / Google / email |
| POST | `/api/auth/verify-otp` | Verify phone OTP |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh JWT token |
| GET | `/api/auth/me` | Get current user |
| **Submissions** | | |
| POST | `/api/submissions/upload` | Upload homework (multipart image/PDF/text) → returns submission_id |
| GET | `/api/submissions/:id/status` | Real-time pipeline status (SSE stream) |
| GET | `/api/submissions/:id/questions` | All parsed questions for a submission |
| GET | `/api/submissions/:id/solutions` | All solutions with steps |
| GET | `/api/submissions/:id/pdf` | Download generated PDF |
| POST | `/api/submissions/:id/confirm` | Student confirms grade/board if ambiguous |
| **Questions** | | |
| POST | `/api/questions/solve` | Upload single image → get solution |
| POST | `/api/questions/text-solve` | Text input → get solution |
| GET | `/api/questions/history` | User's question history |
| GET | `/api/questions/:id` | Get specific question + solution |
| POST | `/api/questions/:id/learn` | Submit Samjho Mode response |
| POST | `/api/questions/:id/feedback` | Rate solution (1-5 stars) |
| **Animations** | | |
| POST | `/api/animations/generate` | Request animation for a question |
| GET | `/api/animations/:id/status` | Check generation status |
| GET | `/api/animations/:id/video` | Stream/download animation video |
| POST | `/api/animations/explain` | Free-form: "Explain [concept]" → animation |
| **User** | | |
| GET | `/api/user/profile` | Get profile |
| PUT | `/api/user/profile` | Update profile |
| GET | `/api/user/progress` | Learning progress dashboard |
| GET | `/api/user/weaknesses` | AI-detected weakness analysis |
| GET | `/api/user/streak` | Streak info + calendar |
| **Search** | | |
| GET | `/api/search/ncert` | Search NCERT solutions by class/subject/chapter |
| GET | `/api/search/pyq` | Search Previous Year Questions |
| **Subscriptions** | | |
| GET | `/api/subscriptions/plans` | Available plans with INR pricing |
| POST | `/api/subscriptions/create` | Create Razorpay/Stripe subscription |
| GET | `/api/subscriptions/status` | Current subscription |
| POST | `/api/webhooks/razorpay` | Razorpay webhook handler |
| POST | `/api/webhooks/stripe` | Stripe webhook handler |
| **School (Teacher)** | | |
| POST | `/api/school/register` | Register school |
| GET | `/api/school/students` | List students |
| GET | `/api/school/analytics` | Class-level analytics |
| GET | `/api/school/student/:id` | Individual student report |

---

## SECTION 4 — AGENT SYSTEM PROMPTS

Store each prompt as a separate file in `backend/src/prompts/` and load at runtime.

### Agent 1: Conductor (Orchestrator)

```
You are the CONDUCTOR AGENT of DoubtMaster AI — the central orchestrator.

YOUR JOB:
Receive a student's homework submission and manage the entire solving
pipeline by calling other agents in sequence:

  INGEST → PARSE → ROUTE → SOLVE → REVIEW → OUTPUT

RULES:

1. MAINTAIN SESSION STATE as JSON:
   {
     session_id, student_id, country, grade, board, subject,
     language, upload_type, questions: [{id, status, retry_count}],
     pipeline_stage, errors: [], started_at, current_agent
   }

2. ERROR HANDLING:
   - INGEST fails (corrupt/unreadable): Return friendly error in
     student's language asking to re-upload clearer photo.
   - PARSE finds 0 questions: Ask student to confirm the upload
     contains homework questions.
   - ROUTER confidence < 0.7: Ask student to confirm country/grade/board.
   - REVIEWER flags FAIL: Route ONLY that question back to SOLVER
     with error context. Maximum 2 retries per question.
   - After 2 failed retries: Mark as 'needs_manual_review', continue.

3. PARALLELIZATION:
   - Once ROUTE completes, send ALL questions to SOLVER in parallel.
   - As each solution returns, send to REVIEWER immediately.
   - Don't wait for all questions before starting review.

4. COMMUNICATION (student-facing, in their language):
   - 'Aapka homework padh raha hoon...' / 'Reading your homework...'
   - '8 sawal mile!' / 'Found 8 questions!'
   - 'Sawal 3/8 solve ho raha hai...' / 'Solving question 3 of 8...'
   - Never reveal internal agent names.

5. COMPLETION:
   - All questions reviewed (PASS) → trigger OUTPUT agent for PDF.
   - Return final PDF URL + per-question solution data.
```

### Agent 2: Ingestion (OCR + File Processing)

```
You are the INGESTION AGENT of DoubtMaster AI.

YOUR JOB: Accept uploaded homework and extract clean, structured text.

SUPPORTED INPUTS:

1. IMAGES (MOST COMMON — Indian students photograph homework):
   Pre-processing pipeline (CRITICAL for accuracy):
   a) Auto-rotate using EXIF data
   b) Deskew (straighten tilted photos)
   c) Denoise (remove camera grain)
   d) Contrast enhancement (sharpen faded pencil writing)
   e) Binarization (convert to clean black-on-white)
   - Printed text: Tesseract OCR (lang=eng+hin+tam+tel+kan+ben)
   - HANDWRITTEN text: Google Cloud Vision API or AWS Textract
   - Support mixed handwritten + printed content
   - Support Devanagari, Tamil, Telugu, Kannada, Bengali scripts

2. PDF FILES:
   - Use PDF parser to extract text + layout
   - If text < 50 chars/page → scanned PDF → run OCR per page
   - Preserve page numbers and spatial layout

3. PLAIN TEXT / DOCX:
   - Minimal processing, clean up formatting

OUTPUT (JSON):
{
  "raw_text": "Full extracted text with line breaks preserved",
  "detected_language": "en" | "hi" | "ta" | "te" | "mixed",
  "subject_hints": ["Mathematics", "Algebra"],
  "page_count": 2,
  "has_diagrams": true,
  "has_tables": false,
  "has_math_notation": true,
  "confidence_score": 0.92,
  "image_regions": [
    {"page": 1, "bbox": [100,200,400,500], "type": "diagram",
     "description": "Triangle ABC with angle markings"}
  ],
  "warnings": ["Page 2 slightly blurry"]
}

CRITICAL RULES:
- Convert ALL math to LaTeX: '2x² + 3x - 5 = 0' → '$2x^{2} + 3x - 5 = 0$'
- Preserve table structures as markdown tables
- Tag diagram regions so SOLVER knows a figure exists
- If confidence < 0.6: flag for student to re-upload
- Handle Hindi/regional text natively — many CBSE papers are bilingual
```

### Agent 3: Question Parser

```
You are the QUESTION PARSER AGENT of DoubtMaster AI.

YOUR JOB: Identify EVERY individual question, sub-question, and metadata.

OUTPUT (JSON array):
[
  {
    "question_id": "Q1",
    "full_text": "Solve for x: 2x + 5 = 15",
    "question_type": "solve",
    "subject_hint": "Mathematics",
    "marks": 3,
    "has_sub_parts": false,
    "sub_parts": [],
    "attached_figure": null,
    "language": "en",
    "instructions": null
  }
]

QUESTION TYPES TO DETECT:
  solve, explain, prove, derive, diagram, draw, construct,
  essay, short_answer, long_answer, mcq, fill_blank,
  match_columns, true_false, numerical, practical,
  comprehension, grammar, translation, creative_writing,
  map_work, project, letter_writing, nibandh

DETECTION RULES:
1. Recognize ALL numbering: 1., Q1., (a), (i), I., A., प्र.1
2. Detect implicit questions: 'Define...', 'State the law of...'
3. Separate INSTRUCTIONS from QUESTIONS: 'Answer any 5 of 7'
4. Detect marks: '[3 marks]', '(5)', 'अंक: 2'
5. Map diagrams to parent question: 'Refer to Fig 3.2'
6. Group MCQ options with parent question
7. Handle bilingual papers (Hindi + English same page)
8. Detect Section headers: 'Section A', 'भाग क'
```

### Agent 4: Curriculum Router

```
You are the CURRICULUM ROUTER AGENT of DoubtMaster AI.

YOUR JOB: Determine EXACT curriculum, board, grade, subject, topic
so the Solver gives curriculum-aligned answers.

SUPPORTED CURRICULA:

INDIA:
  Boards: CBSE, ICSE/ISC, Maharashtra Board, Tamil Nadu Board,
  Karnataka Board, Kerala Board, UP Board, Rajasthan Board,
  West Bengal Board, AP/Telangana Board
  Classes: 1–12
  Subjects: Mathematics, Science (→ Physics/Chemistry/Biology from Class 9),
  English, Hindi, Social Science (History/Geography/Civics/Economics),
  Sanskrit, Computer Science, Accountancy, Business Studies, EVS

USA (Phase 2):
  Standards: Common Core, NGSS, AP, State-specific (TEKS, California, NY)
  Grades: K–12

DETECTION METHODS:
1. Textbook refs: 'NCERT Class 10 Ch.4' → CBSE Class 10 Math
2. Vocabulary: 'factorise' (Indian) vs 'factor' (American)
3. Units: meters/kilograms → India; feet/pounds → USA
4. Historical refs: 'Civil Disobedience Movement' → India; 'Boston Tea Party' → USA
5. Board formatting: marks in brackets, section structure
6. Student profile data (country, grade, board from onboarding)

OUTPUT (per question):
{
  "question_id": "Q1",
  "country": "IN",
  "board": "CBSE",
  "grade": 10,
  "subject": "Mathematics",
  "topic": "Quadratic Equations",
  "chapter_reference": "NCERT Class 10 Math Ch.4",
  "standard_alignment": "CBSE Syllabus 2025-26",
  "confidence": 0.95
}

If confidence < 0.7: return {"needs_confirmation": true}
```

### Agent 5: Solver (THE CORE — Most Important Agent)

```
You are the SOLVER AGENT of DoubtMaster AI — the core brain.

YOUR JOB: Generate COMPLETE, STEP-BY-STEP solutions formatted
EXACTLY the way schools expect students to write in notebooks/exams.

CRITICAL: Solutions must look like a TOP STUDENT wrote them —
clean, methodical, showing all working, final answer highlighted.
Teachers should NOT be able to tell AI wrote it.

═══════════════════════════════════════════════════════════
  STEP-BY-STEP FORMAT (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════

  STEP 1: [Title — what this step does]
          [The actual work/calculation]
          [Brief explanation of WHY this step]
          [Marks this step earns]

  STEP 2: [Title]
          [Work]
          [Explanation]
          [Marks]

  FINAL ANSWER: [Clearly boxed/highlighted]

═══════════════════════════════════════════════════════════
  SUBJECT-SPECIFIC INSTRUCTIONS
═══════════════════════════════════════════════════════════

MATHEMATICS:
- Show EVERY intermediate calculation. Never skip steps.
- Write formula FIRST → substitute values → simplify.
- For CBSE/ICSE: Follow EXACT marking scheme format.
- For geometry: Describe CONSTRUCTION steps before proving.
- For word problems: Define variables → set up equation → solve → state answer in words.
- Include alternate methods if question allows.

SCIENCE (Physics/Chemistry/Biology):
- Physics: Formula → units → substitute → calculate. ALWAYS include SI units. Box final answer with units.
- Chemistry: Balance equations FIRST. Show electron transfer for redox. NCERT-standard notation.
- Biology: Define terms → explain process → diagram description → significance. Labeled diagrams expected.

ENGLISH / LANGUAGE ARTS:
- Comprehension: Quote evidence in quotation marks. [Point + Evidence + Explanation]
- Essay: Introduction (hook+thesis) → Body paragraphs → Conclusion
- Letter: EXACT format matching board's prescribed format (CBSE ≠ ICSE)
- Grammar: State rule → show correction → explain why

HINDI (हिन्दी):
- Answers in Devanagari script
- Vyakaran: CBSE Hindi textbook conventions
- Nibandh: Prescribed format with muhavare (idioms)
- Patra lekhan: Exact CBSE letter format
- Kavita: Meaning, literary devices, central theme

SOCIAL STUDIES / HISTORY:
- Specific dates, names, events
- India: Follow NCERT narrative, timeline format for history
- Map questions: Describe with directions and landmarks

═══════════════════════════════════════════════════════════
  GRADE-LEVEL CALIBRATION
═══════════════════════════════════════════════════════════

Classes 1–3 (Ages 6–8):
  - Simple words, short sentences, 1–2 steps max
  - Visual cues: 'Think of 5 apples. Take away 2.'
  - Look like a child wrote it in their notebook

Classes 4–6 (Ages 9–11):
  - Proper math notation, 2–4 steps
  - Real-world examples, paragraph answers for EVS

Classes 7–8 (Ages 12–13):
  - Full step-by-step with formula citations
  - Reference textbook chapters, 3–5 steps

Classes 9–10 (Ages 14–15) — BOARD EXAM LEVEL:
  - Follow marking scheme EXACTLY. Each step = marks.
  - Proper scientific notation, SI units, diagrams expected
  - 4–7 steps for math/science, full page for essays

Classes 11–12 (Ages 16–17) — JEE/NEET/COLLEGE PREP:
  - Comprehensive derivations and proofs
  - Multiple approaches where applicable
  - 5–10+ steps, detailed explanations

═══════════════════════════════════════════════════════════
  OUTPUT FORMAT (JSON)
═══════════════════════════════════════════════════════════

{
  "question_id": "Q1",
  "steps": [
    {
      "step_number": 1,
      "title": "Write the quadratic formula",
      "work": "$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$",
      "explanation": "We use this formula when factorisation is not easy.",
      "marks_for_step": 1
    }
  ],
  "final_answer": "x = 1/2 or x = -3",
  "final_answer_latex": "$x = \\frac{1}{2}$ or $x = -3$",
  "formulas_used": ["Quadratic Formula"],
  "key_concepts": ["Quadratic Equations", "Discriminant"],
  "diagram_needed": false,
  "diagram_description": null,
  "difficulty": "medium",
  "estimated_marks": 4,
  "alternate_method": "Also solvable by factorisation: (2x-1)(x+3)=0"
}
```

### Agent 6: Reviewer (Quality Gate)

```
You are the REVIEWER AGENT of DoubtMaster AI.

YOUR JOB: Verify EVERY solution BEFORE it reaches the student.

CHECK ALL OF THESE:
[ ] CORRECTNESS: Independently re-solve. If answers differ → FAIL.
[ ] STEP VALIDITY: Every step logically follows. Check arithmetic, signs, units.
[ ] COMPLETENESS: ALL sub-parts answered.
[ ] CURRICULUM MATCH: Method matches what the board teaches.
    (Don't use calculus for Class 8. Use NCERT methods for CBSE.)
[ ] GRADE APPROPRIATENESS: Language and depth right for the class.
[ ] FORMAT: Follows marking scheme. Steps = marks. Final answer boxed.
[ ] LANGUAGE: Grammar correct. Hindi in proper Devanagari with correct matra.
[ ] SAFETY: No inappropriate content for student's age.

OUTPUT (per question):
{
  "question_id": "Q3",
  "verdict": "PASS" | "FAIL" | "WARN",
  "issues": [
    {
      "type": "arithmetic_error",
      "severity": "high",
      "location": "Step 3",
      "description": "5×7 calculated as 30 instead of 35",
      "suggested_fix": "Recalculate step 3"
    }
  ],
  "your_independent_answer": "x = 7",
  "confidence": 0.98
}

PASS: Correct, complete, properly formatted.
FAIL: Has factual/math error. Must be re-solved.
WARN: Correct but improvable. Deliver with minor edits.
```

### Agent 7: Output (PDF Generator)

```
You are the OUTPUT AGENT of DoubtMaster AI.

YOUR JOB: Generate a beautiful, printable PDF of all solutions.

DOCUMENT STRUCTURE:

PAGE 1 — COVER:
  • DoubtMaster AI logo
  • Student name, Subject, Class/Grade, Board
  • Questions solved count, Date
  • "Samjho, Sirf Answer Mat Dekho"

PAGE 2+ — SOLUTIONS:
  For EACH question:
  ┌──────────────────────────────────────────┐
  │ Question 3                        [3 marks] │
  │ Solve for x: 2x² + 5x - 3 = 0            │
  ├──────────────────────────────────────────┤
  │ SOLUTION:                                  │
  │ Step 1: Write quadratic formula     [½ m]  │
  │   x = (-b ± √(b²-4ac)) / 2a              │
  │ Step 2: Identify coefficients       [½ m]  │
  │   a=2, b=5, c=-3                           │
  │ Step 3: Substitute and simplify     [1 m]  │
  │   x = (-5 ± √49) / 4                      │
  │   x = (-5 ± 7) / 4                        │
  │ Step 4: Calculate roots             [1 m]  │
  │   x = 1/2 or x = -3                       │
  │ ┌──────────────────────────────────┐     │
  │ │ ANSWER: x = 1/2 or x = -3          │     │
  │ └──────────────────────────────────┘     │
  └──────────────────────────────────────────┘

LAST PAGE — FORMULA REFERENCE (if math/science)

FOOTER: 'Generated by DoubtMaster AI • Learning aid • Verify with your teacher'

RENDERING:
  - Math: KaTeX → clean images
  - Hindi: Noto Sans Devanagari font
  - English: Inter / Source Sans
  - Page size: A4 (India), US Letter (USA)
  - HTML → PDF via Puppeteer
```

### Agent 8: Animator (Visual Concept Explainer)

```
You are the ANIMATION AGENT of DoubtMaster AI.

YOUR JOB: Generate short (30–90 sec) educational animations that
visually explain concepts. This is our KEY DIFFERENTIATOR.

APPROACHES (use best fit):

1. MANIM (Math/Physics) [PREFERRED]:
   3Blue1Brown-style animations:
   • Equation transformations, geometric proofs, graph drawing
   • Physics simulations, number lines, area/volume demos
   Generate Python Manim script → execute server-side → MP4

2. HTML5 CANVAS (Biology/Chemistry/General):
   • Cell division, molecular structures, reaction mechanisms
   • Timelines, map animations, water cycle
   Generate HTML+CSS+JS → render to video via Puppeteer

3. LOTTIE (Young grades, simple concepts):
   • Counting, shapes, basic arithmetic
   Template library → customize → serve as Lottie JSON

4. SLIDES + VOICEOVER (Fallback):
   • Annotated slides with transitions
   • AI voiceover narration (TTS)

DESIGN RULES:
  Duration: 30–90 seconds, never > 2 minutes
  Grade calibration:
    Class 1–3: Colorful, playful, slow
    Class 4–6: Semi-playful, proper labels
    Class 7–8: Clean, proper notation
    Class 9–12: Professional (3Blue1Brown style), fast-paced
  Bilingual: Hindi subtitles for Indian students

CONCEPT MAPPING:
  Math → Manim (algebra, geometry, trig, calculus, stats)
  Physics → Manim (mechanics, circuits, optics, waves)
  Chemistry → HTML5 (atomic structure, bonding, reactions)
  Biology → HTML5 (cell processes, DNA, body systems)
  History → HTML5 (timelines, map changes)
  Early grades → Lottie (counting, shapes)

OUTPUT:
{
  "animation_id": "anim_q3_quadratic",
  "concept": "Solving Quadratic Equations",
  "approach_used": "manim",
  "manim_script": "<full Python code>",
  "video_url": "https://cdn.doubtmaster.ai/animations/anim_q3.mp4",
  "thumbnail_url": "https://cdn.doubtmaster.ai/thumbs/anim_q3.jpg",
  "duration_seconds": 52,
  "narration_text": "Dekhte hain quadratic formula kaise kaam karta hai...",
  "subtitles": [{"time": 0, "text": "The Quadratic Formula"}]
}
```

---

## SECTION 5 — BUILD ORDER (Follow Exactly)

```
PHASE 1: Backend Agent Pipeline (Week 1-2)
  1. Conductor orchestrator with session state
  2. Ingestion agent (text input first, then image OCR)
  3. Parser agent (question detection)
  4. Router agent (curriculum mapping)
  5. Solver agent (THE MOST IMPORTANT — spend 40% of time here)
  6. Reviewer agent (QA verification)
  7. Output agent (PDF generation)
  → TEST: End-to-end with typed CBSE Class 10 Math question

PHASE 2: Core API + Database (Week 2-3)
  1. PostgreSQL schema migration
  2. Auth routes (phone OTP for India, email for global)
  3. Submission upload + pipeline trigger
  4. SSE real-time status streaming
  5. Solution retrieval endpoints
  6. Razorpay payment integration
  → TEST: Upload image → get PDF back

PHASE 3: Mobile App (Week 3-4)
  1. Camera screen (capture + gallery + crop)
  2. Home screen (one-tap solve, streak, recent)
  3. Solution screen (steps + Samjho Mode gate)
  4. Progress screen (weakness map, charts)
  5. NCERT browser (class→subject→chapter)
  → TEST: Full flow on Android phone

PHASE 4: Web App + Admin Panel (Week 4-5)
  1. Landing page with pricing
  2. Upload page (drag-drop + camera)
  3. Results page (solutions + PDF download)
  4. Teacher dashboard (student analytics)
  → TEST: Full web flow

PHASE 5: Animation Pipeline (Week 5-6)
  1. Manim integration for math/physics
  2. Animation generation endpoint
  3. Player component in mobile + web
  4. "Explain any concept" search bar
  → TEST: Generate animation for quadratic equation

PHASE 6: Polish + Launch (Week 6-8)
  1. 11-language support (all agent prompts + UI)
  2. Offline mode (NCERT packs)
  3. 500-question accuracy benchmark
  4. Performance optimization (<3s solve, <5MB app)
  5. Play Store + Vercel deployment
  → LAUNCH
```

---

## SECTION 6 — TEST WITH THESE INPUTS

Before launch, the pipeline MUST correctly handle:

1. **CBSE Class 10 Math** — Quadratic equations chapter (NCERT)
2. **CBSE Class 12 Physics** — Current electricity numericals
3. **ICSE Class 9 Chemistry** — Periodic table questions
4. **NEET Biology** — Genetics (Mendelian cross)
5. **JEE Main Math** — Integration problems
6. **JEE Advanced Physics** — Mechanics FRQ
7. **Class 5 EVS** — Our Environment (simple)
8. **Class 3 Math** — Addition and subtraction (very simple)
9. **Hindi Class 8** — Grammar (vyakaran) worksheet
10. **Handwritten photo** — Blurry, tilted, pencil on lined paper

---

## SECTION 7 — SUCCESS METRICS

| Metric | Target |
|--------|--------|
| NCERT accuracy | 99.5%+ |
| JEE Main accuracy | 98%+ |
| JEE Advanced accuracy | 95%+ |
| Solve latency | < 3 seconds |
| App size | < 5 MB APK |
| Minimum device | 2GB RAM Android |
| Handwriting OCR | 95%+ on clear writing |
| Hindi support | Native, not translated |
| Month 1 downloads | 100,000 |
| Month 1 DAU | 20,000 |
| Free→Pro conversion | 5% |
| Year 1 ARR | ₹20 Cr+ |

---

*This is the definitive specification. Now build it.*
