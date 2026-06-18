## Context

`getCurrentUser()` in `lib/auth.ts` lazily provisions a local `User` row on the
first authenticated request (the "Issue 2.1" lazy-upsert pattern, chosen so the
app never depends on Descope's audit webhook arriving first). For an existing
user it does a single `findUnique({ where: { descope_id } })` and returns — no
writes. For a brand-new user it falls through to a create path:

```ts
const existing = await prisma.user.findUnique({ where: { descope_id } }); // null
// ...
const preExisting = await prisma.user.findUnique({ where: { email } });    // null
const created = await prisma.user.upsert({ where: { email }, create: {...}, update: { descope_id } });
```

The problem is that one dashboard render issues **three** concurrent
`getCurrentUser()` calls — `app/dashboard/layout.tsx`, `app/dashboard/page.tsx`
(via `requireUser`), and `components/AppHeader.tsx` — and Next.js renders the
layout and page in parallel. React's request cache dedupes `fetch()` but not
arbitrary Prisma calls, so all three run independently. For a cold row, all
three observe "no user" and all three reach the `upsert`. Prisma's `upsert`
compiles to SELECT-then-INSERT (not `INSERT ... ON CONFLICT`) when creating, so
two concurrent inserts collide: one wins, the rest throw
`PrismaClientKnownRequestError` code `P2002` (unique constraint on `email` /
`descope_id`). That throw is uncaught, so `app/error.tsx` ("dropped a stitch")
renders. A manual reload then finds the committed row and takes the read-only
path — masking the bug as "reload fixes it".

Constraints: this is the core auth path on every request, so the fix must add no
latency for the common (existing-user) case and must not change who can sign in.

## Goals / Non-Goals

**Goals:**
- New users reach the dashboard on the first render after signup; the error
  boundary never fires due to provisioning.
- Provisioning is idempotent and correct under concurrent first requests
  (in-process and cross-request, e.g. tab + prefetch).
- Fewer duplicate provisioning queries per render.

**Non-Goals:**
- No change to the Descope sign-up-or-in flow, custom claims, or webhook.
- No schema/migration changes.
- No change to role assignment, the signup-intent → CREATOR promotion, or the
  superadmin elevation logic (already best-effort/try-caught).

## Decisions

### Decision 1: Recover from P2002 instead of throwing (correctness)
On the create path, wrap the insert so that a `P2002` is treated as "someone
else just created it": re-read by `descope_id` (then by `email`) and return that
row. This makes provisioning idempotent regardless of how the race arises —
including cross-request races that an in-process cache cannot cover.

- **Why over alternatives:**
  - *`upsert` alone* — already in use; insufficient because Prisma's upsert is
    not atomic for the create case, which is the whole bug.
  - *Raw `INSERT ... ON CONFLICT DO NOTHING/UPDATE`* — atomic, but bypasses
    Prisma typing and is harder to keep in step with the model; the
    catch-and-reread achieves the same guarantee with less surface area.
  - *Serialize provisioning with an advisory lock* — heavier, adds latency, and
    unnecessary once the insert is idempotent.

### Decision 2: Deduplicate `getCurrentUser()` per request with React `cache()` (defense + perf)
Wrap the resolver in `cache()` (from `react`) so all callers within a single
server request share one invocation and one result. This collapses the three
in-render calls to one, eliminating the in-process race entirely and removing
two redundant DB round-trips per authenticated render.

- **Why both decisions, not just one:** `cache()` removes the *in-render* race
  and is the performance win, but does not protect against two *separate*
  requests (e.g. a navigation plus a route prefetch, or two tabs) provisioning
  the same cold user. Decision 1 is the durable correctness guarantee; Decision
  2 is the in-request optimization and first line of defense. Together they make
  every path safe.

### Decision 3: Apply the same guard to every provisioning write
The DEV-mode upsert and the `descope_id` first-link `update` follow the same
catch-P2002-and-reread shape so no provisioning branch can surface a race.

## Risks / Trade-offs

- **[A re-read after P2002 could still miss the row]** → Re-read by the unique
  key that conflicted (`descope_id`, falling back to `email`); the conflicting
  insert has committed by the time `P2002` is raised, so the row is visible. If
  both lookups somehow miss, fall through to one bounded retry of the upsert,
  then surface the original error rather than loop.
- **[`cache()` masking a stale row within a request]** → Acceptable and correct:
  a single request should see one consistent user identity; mutations that
  change the row (e.g. role elevation) already `revalidatePath`, producing a
  fresh request with a fresh cache.
- **[Catching P2002 too broadly]** → Match on the Prisma error `code === "P2002"`
  only; rethrow anything else so genuine failures still surface.

## Migration Plan

Pure code change in `lib/auth.ts`. Deploy normally; no migration, no env, no
data backfill. Rollback is reverting the commit. Verify by signing up a fresh
user against the deploy and confirming the dashboard renders on the first try
(no error boundary, no reload needed).
