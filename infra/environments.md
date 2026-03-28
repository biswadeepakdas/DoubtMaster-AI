# DoubtMaster AI — Environment Configuration

## Three Environments

### 1. LOCAL (Developer Laptops)

**Trigger**: `docker-compose up` from repo root.

**Services**:
- FastAPI: `http://localhost:8000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- OpenMAIC: `http://localhost:3000`
- Next.js dev server: `http://localhost:3001`

**Environment Variables** (`.env.local`):

| Variable                | Example Value                                         |
|------------------------ |------------------------------------------------------ |
| `DATABASE_URL`          | `postgresql://doubtmaster:localpass@localhost:5432/dm` |
| `REDIS_URL`             | `redis://localhost:6379/0`                             |
| `OPENMAIC_BASE_URL`     | `http://localhost:3000`                                |
| `NVIDIA_NIM_API_KEY`    | `nvapi-dev-xxx`                                        |
| `JWT_SECRET`            | `local-dev-secret-min-32-chars-long!!`                 |
| `ENVIRONMENT`           | `local`                                                |
| `CORS_ORIGINS`          | `http://localhost:3001`                                |
| `LOG_LEVEL`             | `DEBUG`                                                |

**Access Control**: Any developer with repo access.

**Rollback**: Re-run `docker-compose down && docker-compose up --build`.

---

### 2. STAGING (Railway Preview Deploys)

**Trigger**: Automatic on every Pull Request to `main`.

**Services**: Railway preview environments spin up isolated instances of FastAPI, PostgreSQL, and Redis. OpenMAIC staging instance is shared across previews.

**Environment Variables** (Railway preview environment):

| Variable                | Example Value                                                       |
|------------------------ |-------------------------------------------------------------------- |
| `DATABASE_URL`          | `postgresql://...@containers-us-west-xxx.railway.app:5432/railway`  |
| `REDIS_URL`             | `redis://default:xxx@containers-us-west-xxx.railway.app:6379`       |
| `OPENMAIC_BASE_URL`     | `http://openmaic-staging.railway.internal:3000`                      |
| `NVIDIA_NIM_API_KEY`    | `nvapi-staging-xxx`                                                  |
| `JWT_SECRET`            | (auto-generated per preview)                                         |
| `ENVIRONMENT`           | `staging`                                                            |
| `CORS_ORIGINS`          | `https://<pr-slug>.vercel.app`                                       |
| `LOG_LEVEL`             | `INFO`                                                               |

**Access Control**: Team members with Railway project access. Preview URLs are unlisted but not auth-gated at the infra level (app-level JWT still required).

**Rollback**: Close the PR or push a fix commit. Railway automatically tears down preview environments when the PR is closed.

---

### 3. PRODUCTION (Railway + Vercel)

**Trigger**: Merge to `main` branch only. **Manual approval gate** required — Railway production deploy is not automatic; a team lead must approve the deploy in the Railway dashboard.

**Services**:
- FastAPI: `https://api.doubtmaster.app` (Railway)
- PostgreSQL: Railway managed (private networking)
- Redis: Railway managed (private networking)
- OpenMAIC: `http://openmaic.railway.internal:3000` (private networking)
- Frontend: `https://doubtmaster.app` (Vercel)

**Environment Variables** (Railway production + Vercel production):

| Variable                | Example Value                                                |
|------------------------ |------------------------------------------------------------- |
| `DATABASE_URL`          | `postgresql://...@postgres.railway.internal:5432/railway`    |
| `REDIS_URL`             | `redis://default:xxx@redis.railway.internal:6379`            |
| `OPENMAIC_BASE_URL`     | `http://openmaic.railway.internal:3000`                       |
| `NVIDIA_NIM_API_KEY`    | `nvapi-prod-xxx`                                              |
| `JWT_SECRET`            | (stored in Railway encrypted variables)                       |
| `ENVIRONMENT`           | `production`                                                  |
| `CORS_ORIGINS`          | `https://doubtmaster.app`                                     |
| `LOG_LEVEL`             | `WARNING`                                                     |
| `SENTRY_DSN`            | `https://xxx@o123.ingest.sentry.io/456`                       |

**Access Control**: Only project leads can trigger production deploys. Railway environment variables are encrypted and accessible only to admin-role Railway users. Vercel environment variables are similarly restricted to production scope.

**Rollback Procedures**:

1. **Instant rollback (Railway)**: In the Railway dashboard, click "Rollback" on the latest deployment to restore the previous image.
2. **Git revert**: Revert the merge commit on `main`, push, and re-deploy through the approval gate.
3. **Database rollback**: Run `alembic downgrade -1` via Railway's one-off command runner. Only for schema-level issues — data migrations may require manual intervention.
4. **Vercel rollback**: Use Vercel's instant rollback in the deployments dashboard to restore the previous frontend build.

---

## Secret Management

- **Never commit secrets** to the repository. All secrets are injected via Railway / Vercel environment variables.
- Use Railway's "Shared Variables" feature to link PostgreSQL and Redis connection strings automatically.
- Rotate `JWT_SECRET` and `NVIDIA_NIM_API_KEY` quarterly. Coordinate JWT secret rotation with a grace period (accept both old and new for 24 hours).
