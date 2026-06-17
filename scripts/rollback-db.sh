#!/usr/bin/env bash
# RESTORE prod: revert DATABASE_URL to the direct (non-pooled) endpoint that was
# working before the pooling swap. Keeps STORAGE_DRIVER=blob. Run: bash scripts/rollback-db.sh
set -uo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"

DB=$(grep -E '^DATABASE_URL=' .env | head -1 | sed -E 's/^DATABASE_URL=//')
DB="${DB%\"}"; DB="${DB#\"}"
if [ -z "$DB" ]; then echo "ERROR: DATABASE_URL not found in .env"; exit 1; fi

echo "==> Reverting production DATABASE_URL to the direct (non-pooled) endpoint"
npx vercel env add DATABASE_URL production --value "$DB" --force --yes < /dev/null

echo "==> Redeploying to production"
npx vercel --prod

echo "==> Verify"
curl -s -o /dev/null -w "    prod root: HTTP %{http_code}\n" -L https://crafty-app-five.vercel.app/
curl -s -o /dev/null -w "    /bengaluru: HTTP %{http_code}\n" https://crafty-app-five.vercel.app/bengaluru
echo "Expect 307 (root) and 200 (/bengaluru). Storage stays on blob."
