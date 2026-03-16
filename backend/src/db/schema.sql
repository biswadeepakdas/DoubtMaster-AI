-- DoubtMaster AI — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  name TEXT NOT NULL,
  class INTEGER DEFAULT 10,
  board TEXT DEFAULT 'CBSE' CHECK (board IN ('CBSE', 'ICSE', 'STATE', 'IB', 'IGCSE')),
  language TEXT DEFAULT 'en',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'champion')),
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'school_admin', 'admin')),
  avatar_url TEXT,
  solve_count INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- QUESTIONS
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  image_url TEXT,
  subject TEXT NOT NULL,
  topic TEXT,
  class INTEGER,
  board TEXT DEFAULT 'CBSE',
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  language TEXT DEFAULT 'en',
  source TEXT DEFAULT 'text' CHECK (source IN ('text', 'image', 'voice')),
  solve_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_user ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_created ON questions(created_at DESC);

-- ═══════════════════════════════════════════════════
-- SOLUTIONS
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS solutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  steps JSONB NOT NULL DEFAULT '[]',
  final_answer TEXT NOT NULL,
  confidence REAL DEFAULT 0.95,
  model_used TEXT,
  concept_tags TEXT[] DEFAULT '{}',
  related_pyqs TEXT[] DEFAULT '{}',
  alternative_method TEXT,
  review_verdict TEXT CHECK (review_verdict IN ('PASS', 'FAIL', 'WARN')),
  review_score INTEGER,
  from_cache BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solutions_question ON solutions(question_id);

-- ═══════════════════════════════════════════════════
-- SOLUTION RATINGS (student feedback)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS solution_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  solution_id UUID NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(solution_id, user_id)
);

-- ═══════════════════════════════════════════════════
-- SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'champion')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  amount_inr INTEGER NOT NULL,
  razorpay_subscription_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ═══════════════════════════════════════════════════
-- ANIMATIONS
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS animations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  concept TEXT NOT NULL,
  subject TEXT DEFAULT 'math',
  grade INTEGER DEFAULT 10,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'complete', 'failed')),
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds REAL,
  animation_type TEXT DEFAULT 'manim' CHECK (animation_type IN ('manim', 'html5', 'lottie', 'slides')),
  manim_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- USER PROGRESS (learning analytics)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  questions_solved INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  subjects_data JSONB DEFAULT '{}',
  weak_topics TEXT[] DEFAULT '{}',
  study_minutes INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_progress_user_date ON user_progress(user_id, date DESC);

-- ═══════════════════════════════════════════════════
-- LEARN MODE ATTEMPTS (Samjho Mode)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS learn_mode_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  student_response TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  passed BOOLEAN DEFAULT FALSE,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- OTP STORE (temporary, auto-expires)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS otp_store (
  phone TEXT PRIMARY KEY,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- SOLUTION CACHE (for frequently asked NCERT questions)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS solution_cache (
  cache_key TEXT PRIMARY KEY,
  result JSONB NOT NULL,
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '72 hours'
);

CREATE INDEX IF NOT EXISTS idx_cache_expires ON solution_cache(expires_at);

-- ═══════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE learn_mode_attempts ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so backend can access everything.
-- These policies are for direct Supabase client access from frontend.
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can read own questions" ON questions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own questions" ON questions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can read own solutions" ON solutions FOR SELECT
  USING (question_id IN (SELECT id FROM questions WHERE user_id = auth.uid()));
CREATE POLICY "Users can read own subscriptions" ON subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can read own progress" ON user_progress FOR SELECT USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════
-- CLEANUP EXPIRED OTPs (run periodically via pg_cron or app)
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_store WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
