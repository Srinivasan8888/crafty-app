# Launch Readiness Tasks

Legend: **[CODE]** = I can do in this repo now · **[OPS]** = founder-only (dashboard/keys/DNS) · **[VERIFY]** = check against the live URL.
Critical path to "live today": Section 1 → 2 → 3 → 4. Sections 5–6 are reconciliation/fast-follow.

> **Status 2026-06-16:** All `[CODE]` tasks done by the agent. Production already deploys + serves (login fixed + verified this session). Storage approach changed from R2/S3 → **Vercel Blob** (already provisioned: token in all envs, `@vercel/blob` installed, domain whitelisted) — so the R2 bucket/`@aws-sdk` tasks are superseded. Remaining items are `[OPS]`/`[VERIFY]` only the founder can do (flip `STORAGE_DRIVER=blob` in prod + redeploy, set pooled `DATABASE_URL`/`DIRECT_URL`, `SIC_ADMIN_EMAIL`, Descope webhook URL, run the live smoke checks).

## 1. Durable storage — code

- [x] 1.1 **[CODE]** ~~Add `@aws-sdk/client-s3`~~ → **Superseded: use Vercel Blob.** `@vercel/blob` is already a dependency and `BLOB_READ_WRITE_TOKEN` is set in all Vercel envs, so no S3 SDK/bucket is needed. (The `s3` driver remains available if R2/S3 is ever preferred; it would then need `bun add @aws-sdk/client-s3`.)
- [x] 1.2 **[CODE]** Confirmed `lib/image.ts` writes every variant through `getStorage().put(...)` (line 64) — no `fs` writes bypass the driver. No change needed.
- [x] 1.3 **[CODE]** Added `scripts/check-storage.ts` — writes a test object via the active driver and fetches the public URL to confirm round-trip. Run: `STORAGE_DRIVER=blob bunx tsx --env-file=.env scripts/check-storage.ts`.
- [x] 1.4 **[CODE]** `bun run typecheck` passes; `DEV_AUTH=false STORAGE_DRIVER=local bun run build` succeeds — no regression from the schema/script changes. (A plain `bun run build` fails only because local `.env` has `DEV_AUTH=true`, which the auth guard rejects under `NODE_ENV=production` — expected.)

## 2. Object store + production env — ops

- [x] 2.1 **[OPS]** ~~Provision R2/S3 bucket~~ → **Superseded by Vercel Blob** (already provisioned; no bucket/keys to create).
- [ ] 2.2 **[OPS]** **(action needed)** Set `STORAGE_DRIVER=blob` in Vercel **production** (and the preview branch), then redeploy so it takes effect. Command in the handoff. *(Agent attempted this; blocked as a production-infra change pending founder approval.)*
- [x] 2.3 **[OPS/CODE]** Parity pass done: production has `DATABASE_URL`, Descope, Upstash, Resend, Sentry, PostHog, `CRON_SECRET`; preview was seeded for `demo-launch-pass`. Remaining prod gaps are `STORAGE_DRIVER=blob` (2.2) and pooled DB (2.6).
- [x] 2.4 **[OPS]** `DEV_AUTH=false` confirmed in production (and set for the preview branch). `DEFAULT_CITY`/`NEXT_PUBLIC_DEFAULT_CITY` present.
- [x] 2.5 **[CODE]** Added `directUrl = env("DIRECT_URL")` to the Prisma `datasource` (validated with Prisma 5.22). Documented `DIRECT_URL` in `.env.example`; local `.env` set to `DIRECT_URL = DATABASE_URL`.
- [ ] 2.6 **[OPS]** Point production `DATABASE_URL` at Neon's **pooled** endpoint (`-pooler` host) with `?pgbouncer=true&connection_limit=1`; set `DIRECT_URL` to the non-pooled endpoint. (Schema is ready via 2.5.)
- [ ] 2.7 **[OPS]** Replace `SIC_ADMIN_EMAIL=sic-placeholder@crafty.app` with the real second-admin email.

## 3. Deploy

- [x] 3.1 **[OPS/CODE]** Deployed to production via `vercel --prod` — `crafty-app-five.vercel.app`, build READY.
- [x] 3.2 **[OPS]** `NEXT_PUBLIC_SITE_URL` present in prod; set for the preview branch this session.
- [x] 3.3 **[OPS/CODE]** Redeployed this session (login fix). **Note:** another redeploy is required after 2.2/2.6 land.
- [x] 3.4 **[VERIFY]** Prod root resolves (307 → `/bengaluru`), `/sign-in` 200 — no `DEPLOYMENT_NOT_FOUND`.

## 4. Smoke verification (gate before "launched")

- [x] 4.1 **[VERIFY]** Render: prod root → `/bengaluru`, discovery pages render (200) — verified via browser this session.
- [~] 4.2 **[VERIFY]** Auth: Descope sign-in flow now renders the combined `sign-up-or-in` flow on prod and creates new users (fix for E062108). *Full sign-in→/dashboard as a brand-new user still to be confirmed by the founder.*
- [ ] 4.3 **[OPS]** Point the Descope console webhook at `https://crafty-app-five.vercel.app/api/webhooks/descope` (not a dev/placeholder URL).
- [ ] 4.4 **[VERIFY]** Upload-persists: after 2.2, upload an image in prod, fetch its public blob URL (200), redeploy, re-fetch (still 200). Or run `scripts/check-storage.ts` against prod env.
- [ ] 4.5 **[VERIFY]** Cron auth: call a `/api/cron/*` route without the `CRON_SECRET` bearer (expect 401/403), then with it (expect success).
- [ ] 4.6 **[VERIFY]** Error tracking: trigger a test event → Sentry; confirm a `page_view`/`session_start` → PostHog. *(Build still warns "No auth token" — Sentry source-map upload needs `SENTRY_AUTH_TOKEN`; non-blocking.)*
- [ ] 4.7 **[VERIFY]** DB pooling: after 2.6, hit a DB-backed page under light concurrency; confirm no connection-limit errors in Vercel/Neon logs.

## 5. Docs reconciliation

- [x] 5.1 **[CODE]** Updated `STATUS.md`: added a "Production status" block (Vercel/Descope/Neon, live, auth fix); fixed the storage + DB-pooling lines.
- [x] 5.2 **[CODE]** Updated `blockers.md`: added a "Resolved 2026-06-16" section (deploy live, auth, blob storage, favicon, creds, directUrl) and the remaining founder-ops list.
- [x] 5.3 **[CODE]** Noted in `STATUS.md` that the build exceeds PRD V1 scope (payments/messaging/recurring/i18n/PWA/mobile present).

## 6. Fast-follow (not blocking soft launch)

- [ ] 6.1 **[OPS]** Custom domain `crafty.app` → Vercel + SSL; UptimeRobot check on the root.
- [ ] 6.2 **[OPS]** Legal copy review on `/terms` + `/privacy`.
- [ ] 6.3 **[DECISION]** Decide whether over-built V2/V3 surfaces should be feature-flagged off for soft launch (separate change if yes).
