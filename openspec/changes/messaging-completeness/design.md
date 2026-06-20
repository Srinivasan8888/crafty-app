## Context

Buyer↔owner messaging is the last unfinished dashboard surface. The data model and flows exist; the gaps are in the render layer (PII fallback, timestamps, freshness) plus one client UX gap (silent send failure). The privacy leak is live on prod, so the identity fix is the priority.

Current leak sites both use the same pattern `them.display_name ?? them.email`:
- Inbox: `app/dashboard/messages/page.tsx:79`
- Thread header: `app/dashboard/messages/[id]/page.tsx:60`

Both pages already load the linked entity (crafter/store/studio) name, which is the natural privacy-safe label for the owner side.

## Goals / Non-Goals

**Goals:**
- Never render a raw email for the messaging counterparty.
- Make timestamps human-friendly and IST-localized.
- Surface incoming replies without a manual reload.
- Tell the user when a send fails.
- Highlight the active dashboard nav item.

**Non-Goals:**
- No real-time transport (websockets/SSE). Polling is sufficient at current scale.
- No typing indicators, read receipts, attachments, or message editing/deletion.
- No schema changes.

## Decisions

**Privacy-safe identity.** Add a `safeCounterpartyName({ viewerIsBuyer, them, entityName })` helper (in `lib/util.ts` or a small `lib/messaging.ts`) used by both pages:
- If `them.display_name` is set → use it.
- Else if the viewer is the buyer → use the linked listing/business `entityName` (always present, public).
- Else (owner viewing a nameless buyer) → `"Crafty member"`.
- Never return the email. Chosen over "mask the email" (e.g. `s***@indianvcs.com`) because even a masked email is more PII than needed and the business/neutral label is clearer.

**Friendly timestamps.** Use the existing `formatDateTime` from `lib/util.ts` (IST) instead of `created_at.toISOString().slice(...)`. Inbox row → short form; thread bubble → time. No new dependency.

**Live freshness.** The thread is a server component; wrap the message list's refresh in a small client poller that calls `router.refresh()` on an interval (~8–10s) and on `visibilitychange`/focus, pausing when the tab is hidden. Chosen over a websocket/SSE channel because it's zero-infra, and over a dedicated JSON read endpoint because `router.refresh()` reuses the existing server render (and already re-advances the read pointer). Trade-off: up to ~10s latency, acceptable for this product.

**Send-failure feedback.** `ReplyComposer` already has the `res.ok` branch; on `!res.ok` (or thrown), show a toast via the existing `ToastProvider` and keep the typed text so nothing is lost.

**Active nav.** `usePathname()` in a small client wrapper (or pass the active href) to add an active class in the sidebar. Minor.

## Risks / Trade-offs

- [Polling every ~10s adds server load per open thread] → Only the actively-open thread polls, paused when hidden; negligible at current traffic. Revisit if volume grows.
- [`safeCounterpartyName` could hide a legitimately useful name] → It still prefers `display_name`; only the email fallback changes. No regression for users who have names.
- [Active-nav needs a client boundary in a server layout] → Scope the client component to just the nav list; the rest of the layout stays server-rendered.

## Migration Plan

Code-only. Deploy via `main`. The privacy fix is independently shippable and should go first if split.

## Open Questions

- Owner-side fallback label: `"Crafty member"` vs the buyer's masked email vs `"Buyer"`. Proposal assumes `"Crafty member"`.
- Poll interval: 8s vs 10s vs 15s. Proposal assumes ~10s with focus-refresh.
