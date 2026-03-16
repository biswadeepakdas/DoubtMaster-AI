# DoubtMaster AI

**"Samjho, Sirf Answer Mat Dekho"** (Understand, Don't Just See the Answer)

India's #1 AI-powered homework solver for CBSE, ICSE, State Boards, JEE Main/Advanced, NEET, and NCERT (Class 6-12).

## What Makes Us Different

- **Unlimited Free NCERT** — No daily limits. All NCERT solutions, forever free.
- **Learn Mode** — Students must explain their understanding before seeing the answer. Actually learn, don't just copy.
- **11 Languages** — Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati, Malayalam, Punjabi, Odia + English.
- **< 5 MB App** — Works on 2GB RAM budget phones. Offline mode for exam week.
- **99.5% Accuracy** — Trained on 50K+ PYQs. NCERT-exact matching.
- **Teacher Dashboard** — Schools get free analytics with anti-cheating watermarks.
- **India-Priced** — Pro at just Rs.49/month. 25x cheaper than alternatives.

## Project Structure

```
doubtmaster-ai/
├── docs/                      # Strategy, architecture, roadmap documents
│   ├── 01-executive-summary.md
│   ├── 02-competitor-analysis.md
│   ├── 03-product-strategy.md
│   ├── 04-technical-architecture.md
│   ├── 05-launch-roadmap.md
│   └── 06-optimization.md
├── backend/                   # Node.js + Express API
│   └── src/
│       ├── config/            # Environment configuration
│       ├── middleware/         # Auth, validation, rate limiting
│       ├── routes/            # API endpoints
│       ├── services/          # Business logic (solver, payments)
│       └── utils/             # Logger, helpers
├── frontend/
│   ├── mobile/                # React Native (Expo) mobile app
│   │   └── src/
│   │       ├── screens/       # Home, Camera, Solution, Progress
│   │       ├── navigation/    # App navigator
│   │       ├── store/         # Zustand state management
│   │       ├── services/      # API client
│   │       └── i18n/          # 11-language translations
│   └── web/                   # Next.js 15 web app
│       └── src/app/           # Landing page, dashboard
├── ai-pipeline/               # AI/ML processing
│   └── src/
│       ├── ocr/               # Image → text extraction
│       ├── llm/               # Multi-model routing
│       ├── math-engine/       # Symbolic verification
│       ├── curriculum/        # NCERT/JEE/NEET mapping
│       └── multilingual/      # Indian language support
├── admin-panel/               # Teacher/school dashboard
├── tests/                     # Accuracy benchmarks, integration tests
│   └── accuracy/              # 500-question NCERT benchmark
└── deployment/                # Docker, deployment scripts
    ├── docker/                # Dockerfiles, docker-compose
    └── scripts/               # One-click deploy scripts
```

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env       # Configure your API keys
npm install
npm run dev                # Starts on http://localhost:3001
```

### Frontend (Web)
```bash
cd frontend/web
npm install
npm run dev                # Starts on http://localhost:3000
```

### Frontend (Mobile)
```bash
cd frontend/mobile
npm install
npx expo start             # Scan QR with Expo Go
```

### Docker (Full Stack)
```bash
cd deployment/docker
docker compose up -d       # Starts API + PostgreSQL + Redis
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo) + Zustand |
| Web | Next.js 15 + Tailwind CSS |
| Backend | Node.js 20 + Express.js |
| Database | PostgreSQL (Supabase) + Redis |
| AI/OCR | GPT-4o Vision + Tesseract |
| AI/Solver | Claude 3.5 Sonnet + Llama 3.1 70B |
| Payments | Razorpay (India) + Stripe |
| Auth | Supabase Auth (OTP + Google) |
| Deploy | Vercel (frontend) + Render/AWS (backend) |
| Region | AWS Mumbai (ap-south-1) |

## Pricing

| Tier | Price | Highlights |
|------|-------|-----------|
| Free | Rs.0 | Unlimited NCERT, 20 advanced/day |
| Pro | Rs.49/mo or Rs.399/yr | Unlimited everything, Learn Mode, offline |
| Pro+ | Rs.99/mo or Rs.799/yr | + Live chat, study plan, parent reports |
| School | Rs.99/student/yr | Teacher dashboard, analytics, anti-cheat |

## API Endpoints

```
POST /api/auth/register          # Register with phone/email
POST /api/auth/verify-otp        # Verify OTP
POST /api/questions/solve        # Image → solution
POST /api/questions/text-solve   # Text → solution
POST /api/questions/:id/learn    # Learn Mode evaluation
GET  /api/user/progress          # Learning dashboard
GET  /api/search/ncert           # NCERT solution search
GET  /api/subscriptions/plans    # Available pricing plans
POST /api/subscriptions/create   # Create Razorpay subscription
GET  /api/school/analytics       # Teacher analytics
```

## License

Proprietary. All rights reserved.
