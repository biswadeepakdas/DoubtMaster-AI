# DoubtMaster AI — Claude Instructions

## Project Overview
India-focused AI homework solver. FastAPI backend on Railway + Next.js frontend on Vercel.
- Backend: `services/api/` → Railway auto-deploys on push to `main`
- Frontend: `frontend/web/` → Vercel auto-deploys on push to `main`
- DB: PostgreSQL on Railway. Redis on Railway. OpenMAIC sidecar on Railway.

## Autonomous Operation Mode
**Operate fully autonomously. Do not stop to ask for confirmation on standard engineering tasks.**

### When given a task or feature request:
1. Read all relevant files first
2. Plan the work, then execute — do not wait for approval of the plan
3. Launch parallel agents for independent work streams
4. After coding, push to `main` — Railway and Vercel will auto-deploy
5. After pushing, monitor deployment: check Railway logs, Vercel build status
6. If deployment fails, diagnose and fix automatically without prompting the user
7. Report back only when fully done with evidence (screenshots, API responses, or logs)

### When a deployment fails:
- Do NOT ask the user what to do
- Check logs: `railway logs --tail` or Vercel build logs
- Identify the root cause, fix the code, push again
- Retry until it succeeds or you hit 3 attempts (then escalate with full diagnosis)

### When running QA:
- After QA report is written to `.gstack/qa-reports/`, immediately launch fix agents in parallel — one per bug domain (backend, frontend routing, frontend links, frontend UI)
- Do not wait for user to say "fix the bugs" or "assign to devs"
- After all fix agents complete, push everything and verify deployments

### Agent orchestration pattern:
Always launch independent work streams in parallel. Group bugs by file/domain:
- **Backend agent**: API endpoint bugs, token limits, DB queries
- **Frontend routing agent**: Missing pages, broken routes, redirects
- **Frontend links/UI agent**: Broken hrefs, visual bugs, validation
- Never run these sequentially when they touch different files

## Tech Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, `src/lib/api.js` for all API calls
- **Backend**: FastAPI, SQLAlchemy async, Pydantic v2, PostgreSQL via asyncpg
- **LLM Router**: 3-tier (Llama4 NVIDIA → DeepSeek V3 → Claude Sonnet 4.6)
- **Auth**: JWT tokens stored in localStorage, `Authorization: Bearer <token>` header

## Deployment
- Push to `main` → Railway picks up backend changes automatically
- Push to `main` → Vercel picks up frontend changes automatically
- Never use `railway redeploy` for code changes — it reuses old Docker image
- Use `railway logs` to check backend deployment status

## Key Rules
- All backend routes are prefixed `/api/v1/`
- Frontend API calls go to `NEXT_PUBLIC_API_URL` (production Railway URL)
- DeepSeek Tier 2 requires `response_format={"type": "json_object"}` for JSON tasks
- System prompt constants must be module-level in `llm_router.py` for DeepSeek cache
- `max_tokens=2048` for most LLM calls; `max_tokens=4096` for history/detail re-solves

## Do Not Do
- Do not ask "should I push this?" — just push to main
- Do not ask "should I fix this?" when a deployment fails — just fix it
- Do not present a plan and wait — execute the plan
- Do not run agents sequentially when they can run in parallel
