What's still pending — honest categorization
The engineering work is essentially done. What remains is mostly operational + content + a small polish backlog.

✅ Resolved 2026-06-16 (production-launch-readiness)
- Production deploy is live + verified on Vercel (was previously failing / unverified) — Vercel/Descope/Neon stack, not Replit/Clerk.
- Descope auth works for new users — switched sign-in/sign-up to the combined `sign-up-or-in` flow (sign-in-only flow was rejecting first-time users with E062108).
- Durable media storage → use Vercel Blob (`STORAGE_DRIVER=blob`); token already present in all envs, `@vercel/blob` installed, domain whitelisted. No R2/S3 bucket needed. Smoke: `scripts/check-storage.ts`.
- DB pooling prepared — Prisma `directUrl` added; founder to point `DATABASE_URL` at Neon's pooled endpoint + set `DIRECT_URL` (below).
- Favicon — real icon declared via `metadata.icons` (was a 404 placeholder).
- Real creds set in Vercel Production (Descope, Upstash, Resend, Sentry, PostHog, CRON_SECRET, DATABASE_URL); `DEV_AUTH=false` in prod.

Remaining founder ops to fully harden (see below): set `STORAGE_DRIVER=blob` in prod + redeploy, set pooled `DATABASE_URL`/`DIRECT_URL`, replace `SIC_ADMIN_EMAIL`, point the Descope webhook at the prod URL, legal copy, DNS/domain.

🔴 Blocks first soft launch (paste keys, ~1 day)
Item	Type
Descope project setup — paste NEXT_PUBLIC_DESCOPE_PROJECT_ID + DESCOPE_MANAGEMENT_KEY + DESCOPE_WEBHOOK_SECRET, run bun run descope:setup, then Flow Editor styling	Founder ops
Real third-party creds — RESEND_API_KEY, UPSTASH_REDIS_REST_*, NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN or NEXT_PUBLIC_POSTHOG_KEY, SENTRY_DSN, CRON_SECRET	Founder ops
Razorpay setup — account + test keys for RAZORPAY_KEY_ID/SECRET, configure webhook URL, create Subscription Plans (V3 Pro needs plan IDs created in Razorpay dashboard before subs work)	Founder ops
Schedule the 8 cron endpoints — event-reminders (hourly), saved-search-alerts / message-digest / expire-featured / materialize-recurring-events / lifecycle-emails / warehouse-sync (daily), for-you-digest (weekly Sun)	Founder ops (Replit Cron / Vercel Cron / GitHub Actions)
Legal copy review on /privacy + /terms — current copy is template-quality, not lawyer-reviewed	Founder + lawyer (~2-3 day lead)
DNS + domain + SSL + UptimeRobot for cert renewal alerts	Founder ops
🟡 Blocks public marketing launch (~1 week)
Item	Type
Real-device CWV audit on 4G phone (LCP, INP, CLS)	Manual QA
VoiceOver / TalkBack a11y pass on detail pages + forms	Manual QA
Bundle size measurement — analyzer wired, never run; budget target <250KB landing	Engineering smoke
Photography commission — hero anchor, community moment per-city (Cubbon archive + ~₹20-30k spend)	Founder + photographer
Brand mark / logo icon — V1.5 designer deliverable; favicon currently placeholder	Founder + designer
Pgbouncer config on prod Postgres + ?pgbouncer=true&connection_limit=1 in DATABASE_URL	Founder ops
Storage swap to STORAGE_DRIVER=s3 with real S3-compatible bucket (Replit / R2 / S3)	Founder ops
SiC admin promotion — replace SIC_ADMIN_EMAIL=sic-placeholder@crafty.app with the real person	Founder decision
🟢 V3.1 engineering polish (defer until post-launch data)
Item	Effort
Comments on /community page (currently read-only)	S
Per-item OrderItem fulfillment flag (currently whole-order)	S
Refund flow + receipt PDF generation (currently invoice_number text only)	M
Shipping cost + address validation on commerce	M
Real Redis worker process for BullMQ (currently inline mode)	S
BigQuery upload step in warehouse sync (currently writes JSONL to disk)	S
Native mobile build (Expo) — mobile/README.md documents path	L (1-2 weeks)
Embeddings-based recs (pgvector + OpenAI) vs current co-save signals	M-L
Push notifications via web push API (PWA capable today, not wired)	M
Cookie consent granular controls (current is accept/reject)	S
Bulk admin actions in /admin/listings	S
E2E tests for V2 + V3 flows (only 9 critical flows tested today; PRD §19.3 says 8 minimum but covered different things)	M
Real Anthropic key + AI moderation tuning	S + ops
Lifecycle email A/B testing infra	M
🔵 Founder/business work (not engineering)
Item
Day-90 metrics monitoring discipline — daily /admin/metrics review
Curator (Rahul) onboarding + first week of curator entries
8 WhatsApp groups soft-launch announcement (UTM-tagged URLs!)
First Instagram Reel + WhatsApp broadcast cadence
Investor / press framing of the 5K MAU target (T6 reality-check)
Customer support process (hello@crafty.app MX + triage)
Sequence recommendation
Week 1 (this week): Founder ops items in the 🔴 row. End of week → soft launch to 8 WhatsApp groups. ~5 days of paste-and-test work.

Week 2-4: Watch /admin/metrics. Don't build anything new. Fix what users actually complain about.

Month 2 onwards: Pick from 🟡 (polish for public launch) based on what soft-launch data showed mattered.

Month 3+: Open the V3.1 polish backlog based on funnel data.

Net summary
Across V1 + V1.5 + V2 + V3 Tiers 1-4 (~30+ shipped features, ~12,000+ LOC), zero engineering blockers remain. The list above is honest about what's pending — and most of it is decisions, credentials, and content, not code.

What I would NOT recommend right now: building more features. The product is well past the PRD's 12-month roadmap. The next ROI is in actually launching and learning, not shipping V3.1 ahead of demand.

Want me to write the actual launch runbook as docs/launch-checklist.md with copy-paste commands?
