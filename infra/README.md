# DoubtMaster AI — Infrastructure

## Service Communication Map

```
Internet (Students / Teachers)
        │
        ▼
  Vercel CDN (Next.js frontend)
        │  HTTPS / REST
        ▼
  Railway FastAPI (services/api)
        │
        ├──► Railway PostgreSQL   (persistent store, RLS-secured)
        ├──► Railway Redis        (cache, rate-limit counters, Celery broker)
        ├──► OpenMAIC             (internal only — http://openmaic.railway.internal:3000)
        │         └──► LLM APIs   (NVIDIA NIM, OpenAI, Anthropic — routed by OpenMAIC)
        └──► External LLM APIs   (direct fallback when OpenMAIC is bypassed)
```

### Key points

| Service      | Hosting   | Public? | URL pattern                                    |
|------------- |---------- |-------- |------------------------------------------------ |
| Frontend     | Vercel    | Yes     | `https://doubtmaster.app`                       |
| FastAPI      | Railway   | Yes     | `https://api.doubtmaster.app/v1/...`            |
| PostgreSQL   | Railway   | No      | Internal service networking                     |
| Redis        | Railway   | No      | Internal service networking                     |
| OpenMAIC     | Railway   | **No**  | `http://openmaic.railway.internal:3000`          |

## OpenMAIC Integration

OpenMAIC is a self-hosted LLM router / orchestration layer deployed as a separate Railway service.

- **Internal-only**: OpenMAIC has NO public port. It is reachable exclusively via Railway's private networking at `http://openmaic.railway.internal:3000`.
- **HTTP API calls only**: The FastAPI backend communicates with OpenMAIC strictly through its documented HTTP API. No source-code-level integration or modification is performed.
- **AGPL-3.0 compliance**: OpenMAIC is licensed under AGPL-3.0. Because DoubtMaster interacts with it only over HTTP (network API), and does NOT modify, fork, or distribute OpenMAIC's source code, AGPL copyleft obligations do not propagate to the DoubtMaster codebase. The OpenMAIC container image is pulled and deployed as-is.

### OpenMAIC Source

- GitHub: https://github.com/open-webui/open-webui (formerly Open WebUI / OpenMAIC)
- License: AGPL-3.0

## Deployment Architecture

- **Frontend**: Deployed to Vercel via Git integration on the `main` branch.
- **Backend (FastAPI)**: Deployed to Railway. The `railway.toml` in the repo root configures the build and start commands.
- **Database migrations**: Run automatically on deploy via `alembic upgrade head` in the Railway start command, before uvicorn boots.
- **Redis**: Railway-managed Redis instance, no custom configuration needed.
- **OpenMAIC**: Deployed as a separate Railway service from the official Docker image.

## Networking & Security

- All inter-service communication inside Railway uses private networking (`.railway.internal` hostnames). No database or cache port is exposed to the public internet.
- The FastAPI service is the only backend service with a public domain.
- CORS is configured to allow only the Vercel frontend domain.
- All public endpoints require JWT authentication except `/v1/health` and `/v1/auth/*`.
