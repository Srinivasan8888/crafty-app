## 1. Privacy: stop leaking emails (ship first)

- [x] 1.1 Added `safeCounterpartyName({ viewerIsBuyer, displayName, entityName })` in `lib/messaging.ts`: display name → else business/entity name (buyer view) → else "Crafty member"; never the email
- [x] 1.2 Used it in the inbox (`app/dashboard/messages/page.tsx`) — dropped the `them.email` fallback
- [x] 1.3 Used it in the thread header (`app/dashboard/messages/[id]/page.tsx`) — dropped the `them.email` fallback
- [x] 1.4 Stopped selecting `email` for owner/buyer in both message queries

## 2. Friendly timestamps

- [x] 2.1 Inbox row time → `formatDateTime` (IST)
- [x] 2.2 Thread bubble time → `formatDateTime` (IST)

## 3. Live thread freshness

- [x] 3.1 Added `MessagesAutoRefresh` client poller (~10s + on focus, paused while hidden)
- [x] 3.2 Mounted it in the thread page

## 4. Send-failure feedback

- [x] 4.1 `ReplyComposer` now shows an error toast on `!res.ok`/throw and keeps the typed text

## 5. Dashboard polish

- [x] 5.1 Extracted the sidebar into `components/DashboardNav.tsx` (client) with active-route highlight via `usePathname()`

## 6. Verification

- [x] 6.1 `tsc --noEmit` + `npm test` green (53/53; added `__tests__/lib/messaging.test.ts` asserting no email is ever returned)
- [ ] 6.2 Manual: a nameless counterparty shows the business / "Crafty member" label (no email) in both inbox and thread on a live env
- [ ] 6.3 Manual: open a thread, send from the other account, confirm it appears within ~10s without reload; timestamps read in IST
