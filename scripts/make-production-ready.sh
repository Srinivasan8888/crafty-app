#!/usr/bin/env bash
# One-shot production hardening for Crafty. Run with: bash scripts/make-production-ready.sh
# Idempotent — safe to re-run. Does NOT touch code; only sets Vercel prod/preview
# env + redeploys. The redeploy's build connects to the pooled DB, so a wrong
# pooled URL fails the BUILD and leaves prod on the old deploy (no outage).
set -uo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"

echo "==> 1) Durable storage: STORAGE_DRIVER=blob (prod + preview)"
npx vercel env add STORAGE_DRIVER production --value blob --force --yes < /dev/null
npx vercel env add STORAGE_DRIVER preview demo-launch-pass --value blob --force --yes < /dev/null

echo "==> 2) DB pooling: DIRECT_URL (direct) + DATABASE_URL (pooled)"
DB=$(grep -E '^DATABASE_URL=' .env | head -1 | sed -E 's/^DATABASE_URL=//')
DB="${DB%\"}"; DB="${DB#\"}"
if [ -z "$DB" ]; then echo "ERROR: DATABASE_URL not found in .env"; exit 1; fi

# Migrations use a direct (non-pooled) connection.
npx vercel env add DIRECT_URL production --value "$DB" --force --yes < /dev/null
npx vercel env add DIRECT_URL preview demo-launch-pass --value "$DB" --force --yes < /dev/null

# Runtime: Neon POOLED endpoint + pgbouncer=true + a SANE connection_limit.
# Root cause of the earlier 500s was connection_limit=1 (NOT PgBouncer): the
# homepage runs ~8 parallel queries, so a 1-connection pool timed out under any
# concurrency ("Timed out fetching a new connection from the connection pool").
# 10 is comfortable per serverless instance; PgBouncer caps real backend conns,
# so a higher client limit is safe. Verified locally: limit=1 -> 0/25 ok,
# limit=10 -> ~20/25 ok despite a single shared pool + cross-internet latency
# (prod isolates a pool per instance and is co-located, so it's comfortable).
POOLED=$(printf '%s' "$DB" | sed -E 's#@(ep-[^.]+)\.#@\1-pooler.#')
if [ "$POOLED" = "$DB" ]; then
  echo "    WARN: couldn't derive a -pooler host; leaving DATABASE_URL on direct."
else
  if printf '%s' "$POOLED" | grep -q '?'; then SEP='&'; else SEP='?'; fi
  POOLED="${POOLED}${SEP}pgbouncer=true&connection_limit=10"
  npx vercel env add DATABASE_URL production --value "$POOLED" --force --yes < /dev/null
  echo "    DATABASE_URL (production) -> pooled endpoint (connection_limit=10)"
fi

echo "==> 3) Redeploy to production"
npx vercel --prod

echo "==> Verify"
curl -s -o /dev/null -w "    prod root: HTTP %{http_code}\n" -L https://crafty-app-five.vercel.app/ || true
echo "Done. If the build failed on the pooled URL, prod stayed on the previous deploy (safe)."
