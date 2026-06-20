## 1. Race-safe provisioning in lib/auth.ts

- [x] 1.1 Add a small helper `isUniqueViolation(e)` that returns true only for a Prisma error with `code === "P2002"` (import `Prisma` from `@prisma/client` or duck-type the `code`).
- [x] 1.2 Add a `provisionUser()` helper that runs the create/upsert and, on `P2002`, re-reads the row by `descope_id` then by `email` and returns it; if both miss, do one bounded upsert retry, else rethrow the original error.
- [x] 1.3 Route the new-user create path (`prisma.user.upsert({ where: { email }, ... })`) through `provisionUser()`.
- [x] 1.4 Apply the same P2002-safe guard to the `descope_id` first-link `update` and to the DEV-mode `upsert` so no provisioning branch can throw on a cold row.
- [x] 1.5 Confirm `applyElevations` and `sendSignupWelcome` remain best-effort (already try-caught / fire-and-forget) and are not in the throw path.

## 2. Deduplicate resolution per request

- [x] 2.1 Import `cache` from `react` and wrap the `getCurrentUser` resolver so all callers in one server request share a single invocation (keep the exported name/signature unchanged).
- [x] 2.2 Verify `requireUser` / `requireCreator` / `requireAdmin` / `requireSuperadmin` still call through the cached resolver and behave identically.

## 3. Verify

- [x] 3.1 Reproduce the race locally (simulate concurrent first-touch provisioning for a fresh email) and confirm it no longer throws `P2002`. (`__tests__/lib/provision.test.ts` — 12-way concurrent provision: exactly one insert, all callers get the same row.)
- [x] 3.2 Confirm an existing user still takes the read-only path (no extra writes) and the cache yields a single resolution per render.
- [x] 3.3 `bun run typecheck` (or `tsc --noEmit`) and a production build pass. (tsc clean; `vitest run` 65/65; `next build` clean with DEV_AUTH disabled.)
- [ ] 3.4 On a deploy, sign up a brand-new user and confirm the dashboard renders on the first request — no error boundary, no reload. (Post-deploy check — pending the next production deploy.)
