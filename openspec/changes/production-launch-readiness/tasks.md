# Launch Readiness Tasks

Legend: **[CODE]** = I can do in this repo now · **[OPS]** = founder-only (dashboard/keys/DNS) · **[VERIFY]** = check against the live URL.
Critical path to "live today": Section 1 → 2 → 3 → 4. Sections 5–6 are reconciliation/fast-follow.

## 1. Durable storage — code

- [ ] 1.1 **[CODE]** Add `@aws-sdk/client-s3` to `package.json` dependencies (`bun add @aws-sdk/client-s3`) so the Vercel build resolves the S3 driver.
- [ ] 1.2 **[CODE]** Confirm `lib/image.ts` writes every variant through `getStorage().put(...)` (no direct `fs` writes that bypass the driver); fix if any path bypasses it.
- [ ] 1.3 **[CODE]** Add a one-shot storage smoke script (`scripts/check-storage.ts`) that calls `getStorage().put()` and fetches the returned URL, so storage can be verified without the full UI.
- [ ] 1.4 **[CODE]** Run `bun run typecheck` + `bun run build` locally with `STORAGE_DRIVER=local` to confirm no regression from the dependency add.

## 2. Object store + production env — ops

- [ ] 2.1 **[OPS]** Provision a Cloudflare R2 bucket (or AWS S3): create bucket `crafty-uploads`, generate an access key + secret, enable public read (or attach a public custom-domain / r2.dev base), note the public base URL.
- [ ] 2.2 **[OPS]** Set Vercel **production** env: `STORAGE_DRIVER=s3`, `STORAGE_S3_BUCKET`, `STORAGE_S3_ACCESS_KEY_ID`, `STORAGE_S3_SECRET_ACCESS_KEY`, `STORAGE_S3_PUBLIC_BASE`, and `STORAGE_S3_ENDPOINT` + `STORAGE_S3_REGION=auto` (R2) — via `vercel env add` or the dashboard.
- [ ] 2.3 **[OPS/CODE]** Parity pass: ensure all launch-critical keys exist in Vercel prod (`DATABASE_URL`, `NEXT_PUBLIC_DESCOPE_PROJECT_ID`, `DESCOPE_MANAGEMENT_KEY`, `DESCOPE_WEBHOOK_SECRET`, `UPSTASH_REDIS_REST_URL/TOKEN`, `RESEND_API_KEY`, `RESEND_FROM`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY/HOST`, `CRON_SECRET`). I'll generate the exact `vercel env ls` diff vs `.env`.
- [ ] 2.4 **[OPS]** Set production overrides: `DEV_AUTH=false`, `DEFAULT_CITY`/`NEXT_PUBLIC_DEFAULT_CITY` as desired.
- [ ] 2.5 **[CODE]** Add `directUrl = env("DIRECT_URL")` to the Prisma `datasource db` block so migrations bypass the pooler.
- [ ] 2.6 **[OPS]** Point `DATABASE_URL` at Neon's **pooled** endpoint (`-pooler` host) with `?pgbouncer=true&connection_limit=1`; set `DIRECT_URL` to the non-pooled endpoint — in both Vercel prod and local `.env`. Prevents serverless connection exhaustion at the soft-launch spike (design D6).
- [ ] 2.7 **[OPS]** Replace `SIC_ADMIN_EMAIL=sic-placeholder@crafty.app` with the real second-admin email (blockers.md 🟡).

## 3. Deploy

- [ ] 3.1 **[OPS/CODE]** Deploy to production: `bunx vercel deploy --prod --yes`. Capture the resolved production URL.
- [ ] 3.2 **[OPS]** Set `NEXT_PUBLIC_SITE_URL` to the resolved production URL in Vercel prod env.
- [ ] 3.3 **[OPS/CODE]** Redeploy so `NEXT_PUBLIC_SITE_URL` takes effect (`bunx vercel deploy --prod --yes`).
- [ ] 3.4 **[VERIFY]** Confirm the root URL resolves (no `DEPLOYMENT_NOT_FOUND`/404) and the build is promoted to production.

## 4. Smoke verification (gate before "launched")

- [ ] 4.1 **[VERIFY]** Render: visit root → redirects to default city → a discovery/listing page renders content (200, no 5xx).
- [ ] 4.2 **[VERIFY]** Auth: complete Descope sign-in on the prod URL and reach `/dashboard` as a synced user.
- [ ] 4.3 **[OPS]** Point the Descope console webhook at `https://<prod-domain>/api/webhooks/descope`; confirm it is not a placeholder/dev URL.
- [ ] 4.4 **[VERIFY]** Upload-persists: upload a profile/portfolio image in prod, fetch its public URL (200), then redeploy and re-fetch the same URL (still 200). Satisfies `durable-media-storage`.
- [ ] 4.5 **[VERIFY]** Cron auth: call one `/api/cron/*` endpoint without the `CRON_SECRET` bearer (expect 401/403), then with it (expect success).
- [ ] 4.6 **[VERIFY]** Error tracking: trigger a test event and confirm it lands in Sentry; confirm a `page_view`/`session_start` reaches PostHog.
- [ ] 4.7 **[VERIFY]** DB pooling: hit a DB-backed page with a few concurrent requests; confirm no connection-limit errors in Vercel/Neon logs (design D6).

## 5. Docs reconciliation

- [ ] 5.1 **[CODE]** Update `STATUS.md`: replace Replit/Clerk references with Vercel/Descope/Neon; mark creds + storage + deploy status accurately.
- [ ] 5.2 **[CODE]** Update `blockers.md`: check off resolved 🔴 items (creds set, cron via vercel.json, storage), leave honest remainder (legal copy, DNS, real-device QA).
- [ ] 5.3 **[CODE]** Note in STATUS.md that the build exceeds PRD V1 scope (payments/messaging/recurring/i18n/mobile present) so the next reader isn't misled.

## 6. Fast-follow (not blocking soft launch)

- [ ] 6.1 **[OPS]** Custom domain `crafty.app` → Vercel + SSL; add an UptimeRobot check on the root for cert/uptime alerts.
- [ ] 6.2 **[OPS]** Legal copy review on `/terms` + `/privacy` (template-quality today).
- [ ] 6.3 **[DECISION]** Decide whether over-built V2/V3 surfaces (Razorpay live, AI moderation, messaging) should be feature-flagged off for the soft launch — separate change if yes.
