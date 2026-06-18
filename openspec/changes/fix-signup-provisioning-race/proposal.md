## Why

Brand-new users hit the "Something dropped a stitch" error page on their first
authenticated render after signing up, and have to reload before the dashboard
appears. The cause is a concurrency race in first-touch user provisioning: a
single dashboard render fires `getCurrentUser()` three times in parallel
(layout, page via `requireUser`, and `AppHeader`), and for a user who has no
row yet, every call races to create one. Prisma's `upsert` is a non-atomic
SELECT-then-INSERT, so the losers throw `P2002` (unique constraint), which is
uncaught and trips the global error boundary. On reload the row exists, the
no-write path returns it, and the page renders — which is exactly why a reload
"fixes" it. Signup is the very first impression for every new user, so this is
a launch-blocking defect.

## What Changes

- Make first-touch provisioning in `getCurrentUser()` **race-safe**: when the
  insert loses to a concurrent insert (`P2002`), recover by re-reading the now-
  existing row instead of throwing.
- Make `getCurrentUser()` **request-deduplicated** with React `cache()` so the
  several callers in one render share a single provisioning call — collapsing
  the in-render race and removing redundant DB round-trips.
- Apply the same race-safe pattern to the `descope_id` first-link upsert and the
  DEV-mode upsert so no provisioning path can throw `P2002` on a cold row.
- No schema change, no API change, no change to who can sign in.

## Capabilities

### New Capabilities
- `account-provisioning`: How an authenticated identity (Descope session or DEV
  user) is mapped to a local `User` row on first touch — required to be
  idempotent and safe under concurrent first requests, never surfacing a
  database race to the user.

### Modified Capabilities
<!-- None — no existing spec governs first-touch provisioning today. -->

## Impact

- **Code**: `lib/auth.ts` (`getCurrentUser` and its provisioning upserts; new
  request-scoped cache wrapper). No callers change signature.
- **User-facing**: New users land on the dashboard on the first try; the error
  boundary no longer fires on signup.
- **Performance**: Fewer duplicate provisioning queries per authenticated render
  (one instead of up to three).
- **Risk**: Low and contained to the auth provisioning path; behavior for
  existing users (the common path) is unchanged.
