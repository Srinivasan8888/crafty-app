## Context

The app is built and the stack is swapped from the PRD's Replit/Clerk to **Vercel + Descope + Neon** (intentional, founder-confirmed). All third-party credentials are already present in local `.env` (Descope, Upstash, PostHog, Resend, Sentry, Razorpay, Anthropic). The Vercel project `crafty-app` is linked. `lib/storage.ts` already implements a pluggable `StorageDriver` with a working `S3Driver` (lazy `@aws-sdk/client-s3` import) — it is simply not activated.

The remaining work is operational glue + verification, not new architecture. The two real engineering decisions are (1) which object store to use and (2) what "verified live" means.

## Goals / Non-Goals

**Goals:**
- Uploaded images survive deploys and restarts in production (durable object storage).
- A resolving production URL that passes a defined smoke checklist (render, auth, upload-persist, cron auth, webhook reachability).
- Vercel env parity with the launch-critical subset of `.env`.
- Stale launch docs reconciled to the real stack.

**Non-Goals:**
- No new product features; no touching the over-built V2/V3 surfaces.
- No custom domain / DNS as a hard blocker (the `*.vercel.app` URL is acceptable for soft launch; domain is a fast-follow).
- No lawyer-reviewed legal copy (template copy is accepted risk per existing blockers.md).
- No load testing, CWV audit, or a11y pass (post-soft-launch per TODOS).

## Decisions

**D1 — Object store: Cloudflare R2 (preferred) over AWS S3.**
Rationale: R2 has zero egress fees (image-heavy read workload), is S3-API-compatible (the existing `S3Driver` works unchanged with `forcePathStyle` + custom `endpoint`), and has a simple public-bucket + custom-domain story. AWS S3 is the fallback if the founder already has AWS set up. Either way the code path is identical — only `STORAGE_S3_*` values differ. *Alternative considered:* Vercel Blob — rejected to avoid rewriting the already-built `S3Driver` and to keep storage portable off Vercel.

**D2 — Install `@aws-sdk/client-s3` as a real dependency, not lazy-optional.**
The driver imports it lazily today so dev installs stay light, but in prod it must be present. Add it to `package.json` so the Vercel build has it. The lazy import still works; we just guarantee the package exists.

**D3 — Keep `local` as the dev default; switch to `s3` only via env.**
`getStorage()` already reads `STORAGE_DRIVER`. Production sets `STORAGE_DRIVER=s3`; local dev stays on `local`. No code change to the factory.

**D4 — "Verified live" = an explicit smoke checklist, run against the prod URL** (codified in the `production-deployment` spec), not just "build succeeded." This is what turns the prior `404` into a confident launch.

**D5 — Env management via `vercel env` / dashboard, sourced from `.env`.**
Push the launch-critical keys to Vercel production, overriding `DEV_AUTH=false`, `NEXT_PUBLIC_SITE_URL=<prod url>`, `STORAGE_DRIVER=s3`, and the `STORAGE_S3_*` set. Secrets are never committed.

**D6 — Use Neon's pooled connection for runtime + a direct connection for migrations.**
Verified gap: `DATABASE_URL` currently targets a non-pooled Neon endpoint and no `DIRECT_URL` exists. Vercel serverless spins up many short-lived function instances; each Prisma client opens its own connection, and a non-pooled Neon endpoint will hit `max_connections` under even light concurrent traffic, returning 500s. Fix: point runtime `DATABASE_URL` at Neon's **pooled** endpoint (`-pooler` host) with `?pgbouncer=true&connection_limit=1`, and add a `DIRECT_URL` (non-pooled) used only by `prisma migrate`/`db push` (which can't run through PgBouncer transaction mode). Requires adding `directUrl = env("DIRECT_URL")` to the Prisma datasource. *Alternative considered:* Prisma Accelerate / Data Proxy — rejected as extra infra/cost when Neon's built-in pooler is sufficient at this scale.

## Risks / Trade-offs

- **R2 bucket misconfigured public access → images 403 on the live site.** → Verify with a real upload + public-URL fetch in the smoke checklist (spec scenario), before announcing launch.
- **`NEXT_PUBLIC_SITE_URL` chicken-and-egg** (URL not known until first deploy). → Deploy once to learn the URL, set the env var, redeploy. Cheap on Vercel.
- **Descope webhook still points at a dev/placeholder URL → auth sync silently breaks in prod.** → Webhook reachability is an explicit smoke-checklist item; update the URL in the Descope console.
- **Env drift between local `.env` and Vercel** (a key works locally, missing in prod → runtime 500). → Parity check task diffs the launch-critical key set against `vercel env ls`.
- **Over-built V2/V3 surfaces exposed at launch may confuse first users / break without their own creds** (e.g., Razorpay live mode, Anthropic moderation). → Out of scope for this change, but flagged: those paths no-op cleanly per STATUS.md; revisit feature-flagging in a follow-up if soft-launch feedback warrants.
- **Non-pooled DB connection exhausts under the soft-launch traffic spike** (8 WhatsApp groups arriving at once → many serverless instances → `max_connections`). → Switch `DATABASE_URL` to Neon's pooled endpoint with `connection_limit=1` and keep migrations on `DIRECT_URL` (D6). Verify in the smoke checklist under light concurrent load.

## Migration Plan

1. Provision R2 bucket + API token + public base URL (founder ops).
2. `bun add @aws-sdk/client-s3`; commit.
3. Set Vercel production env (storage + parity).
4. Deploy → capture prod URL → set `NEXT_PUBLIC_SITE_URL` → redeploy.
5. Run smoke checklist. If any item fails, fix and redeploy.
6. Update STATUS.md / blockers.md.

**Rollback:** storage is additive and env-gated — unset `STORAGE_DRIVER` to fall back to `local` (dev only). A bad deploy rolls back via Vercel's instant previous-deployment promotion. No DB migration is involved, so there is nothing destructive to undo.

## Open Questions

- R2 vs existing AWS account? (founder to confirm; default R2.)
- Custom domain `crafty.app` today, or soft-launch on `*.vercel.app` first? (default: vercel.app now, domain fast-follow.)
