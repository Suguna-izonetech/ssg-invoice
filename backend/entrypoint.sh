#!/bin/bash
set -e

echo "⏳ Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  python -c "
import asyncio, asyncpg, os, sys
url = os.environ.get('DATABASE_URL','').replace('postgresql+asyncpg','postgresql')
async def check():
    conn = await asyncpg.connect(url)
    await conn.close()
try:
    asyncio.run(check())
    sys.exit(0)
except:
    sys.exit(1)
" && break || sleep 2
  echo "  Attempt $i/30 - waiting..."
done

echo "✅ PostgreSQL is ready"
echo "🔄 Running migrations..."
alembic upgrade head

echo "🌱 Seeding database..."
python seed.py

echo "🚀 Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --loop asyncio
