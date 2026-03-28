#!/bin/sh
set -e
echo "[startup] Running Alembic migrations..."
alembic upgrade head
echo "[startup] Migrations done. Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1
