## Why

The Crafty codebase is feature-complete — in fact it is built well past its V1 PRD (payments, messaging, recurring events, multi-language, recommendations all already exist). The blocker to "finished" is not features; it is that the app is **not reliably live in production**. Two concrete gaps stop a real soft launch today:

1. **Media storage defaults to the local filesystem** (`STORAGE_DRIVER` unset → `LocalFsDriver`). On Vercel the filesystem is ephemeral and read-only at runtime, so every user-uploaded image is lost on the next deploy (or fails to write at all). Listings are photo-first; this makes the core product non-functional in prod.
2. **The production deploy is unverified** — the last attempt returned `404 DEPLOYMENT_NOT_FOUND`, and Vercel env parity / cron auth / Descope webhook reachability have not been smoke-tested against a live URL.

Goal: get the existing build durably deployed and verified today, not to build anything new.

## What Changes

- Activate the S3-compatible storage driver in production (Cloudflare R2 or S3): provision a bucket, install `@aws-sdk/client-s3`, set `STORAGE_DRIVER=s3` + `STORAGE_S3_*` on Vercel, and verify an upload round-trips to a public URL.
- Establish **environment parity**: ensure every `.env` key needed at runtime is present in the Vercel production environment, with `DEV_AUTH=false`, correct `NEXT_PUBLIC_SITE_URL`, and `STORAGE_DRIVER=s3`.
- **Verify the production deploy end-to-end**: a successful build, a resolving prod URL, homepage → city → listing render, auth sign-in via Descope, an image upload that persists, and cron endpoints reachable with `CRON_SECRET`.
- Reconcile launch-blocker docs (STATUS.md / blockers.md) to the real Vercel/Descope/Neon stack and check off what is now done.
- **Non-goal:** no new product features, no scope expansion. Over-built V2/V3 surfaces are left as-is for this change (a separate decision on flagging them off is out of scope here).

## Capabilities

### New Capabilities
- `durable-media-storage`: User-uploaded images must persist across deploys and restarts by writing to an S3-compatible object store in production, instead of the ephemeral local filesystem.
- `production-deployment`: The application must deploy to Vercel with full environment parity and pass a defined smoke-verification checklist (render, auth, upload persistence, cron auth, webhooks) before being considered launched.

### Modified Capabilities
<!-- None — openspec/specs/ is currently empty; this change introduces the first specs. -->

## Impact

- **Code**: `lib/storage.ts` (S3 driver activation path), `package.json` (`@aws-sdk/client-s3` dependency), `lib/image.ts` (consumer — verify only). No schema changes.
- **Config / infra**: Vercel project `crafty-app` (production env vars), Cloudflare R2 or AWS S3 bucket + access keys + public base URL, `vercel.json` cron (already Hobby-compatible), Descope console webhook URL pointed at the live domain.
- **External services already wired** (verify, don't rebuild): Neon Postgres, Descope auth, Upstash rate-limit, Resend email, Sentry, PostHog, Razorpay.
- **Docs**: STATUS.md, blockers.md — update stale Replit/Clerk references and re-mark blocker status.
- **Ops dependencies the founder must do** (cannot be done in code): create the R2/S3 bucket + keys, paste env vars into Vercel, point DNS/domain, configure the Descope webhook URL.
