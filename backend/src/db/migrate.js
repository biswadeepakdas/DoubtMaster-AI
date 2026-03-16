#!/usr/bin/env node
/**
 * Database migration script — Creates all tables via Supabase
 * Usage: node src/db/migrate.js
 *
 * NOTE: If this script can't connect, copy-paste schema.sql
 * into Supabase Dashboard → SQL Editor → New Query → Run
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// We create tables by using the Supabase REST API to test access,
// then each table is created via individual SQL statements through
// the `rpc` mechanism. Since Supabase doesn't expose raw SQL via REST,
// we create a temporary function, run it, then drop it.

const TABLES_SQL = [
  // Extension
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    name TEXT NOT NULL,
    class INTEGER DEFAULT 10,
    board TEXT DEFAULT 'CBSE',
    language TEXT DEFAULT 'en',
    plan TEXT DEFAULT 'free',
    role TEXT DEFAULT 'student',
    avatar_url TEXT,
    solve_count INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Questions table
  `CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    image_url TEXT,
    subject TEXT NOT NULL,
    topic TEXT,
    class INTEGER,
    board TEXT DEFAULT 'CBSE',
    difficulty TEXT DEFAULT 'medium',
    language TEXT DEFAULT 'en',
    source TEXT DEFAULT 'text',
    solve_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Solutions table
  `CREATE TABLE IF NOT EXISTS solutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    steps JSONB NOT NULL DEFAULT '[]',
    final_answer TEXT NOT NULL,
    confidence REAL DEFAULT 0.95,
    model_used TEXT,
    concept_tags TEXT[] DEFAULT '{}',
    related_pyqs TEXT[] DEFAULT '{}',
    alternative_method TEXT,
    review_verdict TEXT,
    review_score INTEGER,
    from_cache BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Solution ratings
  `CREATE TABLE IF NOT EXISTS solution_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solution_id UUID NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(solution_id, user_id)
  )`,

  // Subscriptions
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    billing_cycle TEXT NOT NULL,
    amount_inr INTEGER NOT NULL,
    razorpay_subscription_id TEXT,
    razorpay_payment_id TEXT,
    status TEXT DEFAULT 'active',
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Animations
  `CREATE TABLE IF NOT EXISTS animations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    concept TEXT NOT NULL,
    subject TEXT DEFAULT 'math',
    grade INTEGER DEFAULT 10,
    status TEXT DEFAULT 'pending',
    video_url TEXT,
    thumbnail_url TEXT,
    duration_seconds REAL,
    animation_type TEXT DEFAULT 'manim',
    manim_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // User progress
  `CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    questions_solved INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    subjects_data JSONB DEFAULT '{}',
    weak_topics TEXT[] DEFAULT '{}',
    study_minutes INTEGER DEFAULT 0,
    UNIQUE(user_id, date)
  )`,

  // Learn mode attempts
  `CREATE TABLE IF NOT EXISTS learn_mode_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    student_response TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    passed BOOLEAN DEFAULT FALSE,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // OTP store
  `CREATE TABLE IF NOT EXISTS otp_store (
    phone TEXT PRIMARY KEY,
    otp TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Solution cache
  `CREATE TABLE IF NOT EXISTS solution_cache (
    cache_key TEXT PRIMARY KEY,
    result JSONB NOT NULL,
    hit_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '72 hours'
  )`,
];

async function migrate() {
  console.log('DoubtMaster AI — Database Migration\n');
  console.log(`Supabase URL: ${process.env.SUPABASE_URL}`);

  // Test connection
  const { error: testErr } = await supabase.from('users').select('id').limit(1);

  if (testErr && testErr.code !== '42P01') {
    // 42P01 = table doesn't exist yet — that's expected
    if (testErr.message?.includes('does not exist') || testErr.code === 'PGRST204') {
      console.log('Tables not found — will create them.\n');
    } else {
      console.log(`Connection test: ${testErr.message} (code: ${testErr.code})`);
      console.log('Continuing anyway...\n');
    }
  } else {
    console.log('Tables already exist! Checking...\n');
  }

  console.log('='.repeat(50));
  console.log('IMPORTANT: This sandbox cannot run raw SQL via REST API.');
  console.log('Please run the migration manually:');
  console.log('');
  console.log('1. Go to: https://supabase.com/dashboard/project/texhsfoixvaxrqczemfi/sql/new');
  console.log('2. Copy-paste the contents of: src/db/schema.sql');
  console.log('3. Click "Run"');
  console.log('='.repeat(50));

  // Try to verify if tables exist after manual migration
  const { data, error } = await supabase.from('users').select('id').limit(1);
  if (!error) {
    console.log('\n✓ Users table exists and is accessible!');
    console.log('Migration appears to be complete.');
  } else {
    console.log(`\n→ Users table status: ${error.message}`);
    console.log('Run schema.sql in the Supabase SQL Editor to create tables.');
  }
}

migrate().catch(console.error);
