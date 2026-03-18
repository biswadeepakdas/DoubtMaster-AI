# DoubtMaster AI — Deployment Guide

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Vercel     │────▶│   Railway    │────▶│  Supabase   │
│  (Frontend)  │     │  (Backend)   │     │ (PostgreSQL) │
│  Next.js 15  │     │  Node.js 22  │     │  + Auth      │
└─────────────┘     │  + Redis     │     └─────────────┘
                     └──────────────┘
```

## Step 1: Supabase (Database)

1. Go to https://supabase.com → New Project
2. Copy your **Project URL** and **Service Role Key** from Settings → API
3. Go to SQL Editor and run the schema from `backend/src/db/schema.sql`
4. Your database is ready

## Step 2: Railway (Backend)

1. Go to https://railway.app → New Project → Deploy from GitHub repo
2. Select `biswadeepakdas/DoubtMaster-AI`
3. Set **Root Directory** to `backend`
4. Add these environment variables:
   ```
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=<generate-a-64-char-random-string>
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_EXPIRES_IN=30d
   SUPABASE_URL=<from-step-1>
   SUPABASE_SERVICE_KEY=<from-step-1>
   REDIS_URL=<railway-will-provide-if-you-add-redis>
   ```
5. Optional: Add a Redis service in Railway and link it
6. Railway auto-deploys on push. Your backend URL will be like `https://doubtmaster-api-production.up.railway.app`

## Step 3: Vercel (Frontend)

1. Go to https://vercel.com → New Project → Import from GitHub
2. Select `biswadeepakdas/DoubtMaster-AI`
3. Set **Root Directory** to `frontend/web`
4. Framework: Next.js (auto-detected)
5. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=<your-railway-backend-url>
   ```
6. Deploy. Your frontend URL will be like `https://doubtmaster-ai.vercel.app`

## Step 4: Connect Frontend ↔ Backend

Update the backend CORS config to allow your Vercel domain:
```
CORS_ORIGIN=https://doubtmaster-ai.vercel.app
```

## Step 5: Custom Domain (Optional)

- Vercel: Settings → Domains → Add `doubtmaster.ai`
- Railway: Settings → Domains → Add `api.doubtmaster.ai`
