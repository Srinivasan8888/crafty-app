#!/usr/bin/env bash
# Set up the SUPERADMIN / god-mode feature (superadmin-god-mode change).
#
#   bash scripts/setup-superadmin.sh
#
# Idempotent and safe to re-run. Does: DB migration (additive) + owner bootstrap
# env (local + Vercel prod) + production deploy. The DB push must happen before
# the deploy, which this ordering guarantees.
set -uo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"

# ── The bootstrap owner. Change this if you want a different email. ──
OWNER_EMAIL="srinivasan@indianvcs.com"

echo "==> 1/4  Apply schema to the database"
echo "         Adds the SUPERADMIN enum value + AdminInvite table. Additive and"
echo "         non-destructive; uses the direct (non-pooled) connection."
bunx prisma db push || { echo "ERROR: prisma db push failed — fix and re-run."; exit 1; }
bunx prisma generate >/dev/null
echo "         schema applied + client regenerated."

echo "==> 2/4  Add SUPERADMIN_EMAIL to local .env"
if grep -qE '^SUPERADMIN_EMAIL=' .env 2>/dev/null; then
  # Replace the existing value in place (portable sed: write to a temp file).
  grep -vE '^SUPERADMIN_EMAIL=' .env > .env.tmp && mv .env.tmp .env
fi
printf '\n# superadmin-god-mode owner bootstrap\nSUPERADMIN_EMAIL=%s\n' "$OWNER_EMAIL" >> .env
echo "         SUPERADMIN_EMAIL=$OWNER_EMAIL"

echo "==> 3/4  Set SUPERADMIN_EMAIL in Vercel production"
npx vercel env add SUPERADMIN_EMAIL production --value "$OWNER_EMAIL" --force --yes < /dev/null \
  || echo "         (warning: vercel env add failed — set it in the dashboard if so)"

echo "==> 4/4  Deploy to production"
npx vercel --prod || echo "         (warning: deploy failed — run 'npx vercel --prod' manually)"

echo
echo "✅ Done. $OWNER_EMAIL is now the owner (SUPERADMIN)."
echo
echo "Next:"
echo "  • Restart your local dev server so it picks up the schema + env:"
echo "      pkill -f 'next dev'; rm -rf .next; bun run dev"
echo "  • Then visit  http://localhost:3000/admin/owner  and  /admin/admins"
echo "  • Prod:       https://crafty-app-five.vercel.app/admin/owner"
echo
echo "Handover later: /admin/admins → 'Make owner' on the real owner (tick"
echo "'step down'), then remove yourself from SUPERADMIN_EMAIL."
