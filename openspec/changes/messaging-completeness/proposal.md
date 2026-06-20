## Why

The dashboard's other sections (listings, products, orders, sales, cart, subscription, saved, API keys) are built. **Messaging is the unfinished one.** It works end-to-end — send/receive, read pointers, unread badges, inbox + thread — but it has a privacy leak and missing polish that make it feel half-done:

- On production the thread/inbox shows the **counterparty's raw email** (e.g. `srinivasan@indianvcs.com`) whenever that person has no `display_name`. That exposes a crafter's personal email to buyers (and a buyer's email to crafters) — a real privacy break.
- Timestamps render as raw UTC ISO (`2026-06-18 17:02`) instead of friendly local time.
- The open thread never updates without a manual page reload — an incoming reply from the other person doesn't appear until you refresh.
- A failed send is swallowed silently (no error shown).

## What Changes

- **BREAKING (privacy) — stop leaking emails.** Never fall back to a raw email for the counterparty's name.
  - Buyer's view of a thread/inbox row falls back to the **linked listing/business name** (already loaded on both pages) instead of the owner's email.
  - Owner's view falls back to the buyer's `display_name`, else a neutral label ("Crafty member") — never the email.
  - Fix sites: `app/dashboard/messages/page.tsx:79`, `app/dashboard/messages/[id]/page.tsx:60`.
- **Friendly timestamps.** Replace raw `toISOString()` with the existing `formatDateTime` helper (IST-localized) in the inbox and thread.
- **Live thread freshness.** The open conversation polls for new messages on a light interval (and on window focus) so an incoming reply appears without a manual reload. Today `router.refresh()` only fires after *you* send.
- **Send-failure feedback.** `ReplyComposer` surfaces a toast/error when the POST fails instead of silently dropping the message.
- **Dashboard polish.** The sidebar nav highlights the active route (currently no active-state indication).

## Capabilities

### New Capabilities
- `direct-messaging-experience`: privacy-safe identity display (never expose a raw email), live thread freshness, friendly timestamps, and send-failure feedback for the buyer↔owner messaging UI.

### Modified Capabilities
- None at the spec/requirement level for existing capabilities; `creator-message-notifications` (email digests) is unrelated to this UI work.

## Impact

- **UI**: `app/dashboard/messages/page.tsx`, `app/dashboard/messages/[id]/page.tsx`, `app/dashboard/messages/[id]/ReplyComposer.tsx`, `app/dashboard/layout.tsx` (active nav).
- **Possibly a small helper**: a `safeCounterpartyName()` util so the privacy fallback is consistent across inbox + thread.
- **Live freshness** adds a client poll against a lightweight read endpoint (or `router.refresh()` on an interval) — no websockets, no schema change.
- **No DB / no migration.** All `display_name`/`email` fields already exist; this only changes what is rendered.
- **Privacy note**: the leak is **live on prod** (`crafty-app-five.vercel.app`). The email fallback fix should ship promptly.
