# Crafty — TODOs

Created: 2026-05-02 from `/plan-design-review` of `Crafty-PRD-v1.md`.

These are work items surfaced by the design review that don't belong in V1 PRD spec but should be tracked. Each item names the work, the why, the prerequisites, and what it blocks.

---

## T1 — Replace tailwind.config.ts font stacks with non-system-ui typography

**What.** Edit [crafty-app/tailwind.config.ts:13-14](crafty-app/tailwind.config.ts#L13-L14) to use ABC Diatype (body / UI) + ABC Maxi Round (display) per PRD §17.2 — or a licensed free substitute (e.g., Inter + Fraunces) per Open Q I. Wire via `@next/font/local` with self-hosted `.woff2` files; ensure `font-display: swap` and `<link rel="preload">` per §19.2.

**Why.** Current tailwind config ships `ui-sans-serif, system-ui, -apple-system, ...` as both `sans` AND `display`. PRD §17.2 explicitly forbids this — system-ui as primary is the AI-slop signal #11 ("I gave up on typography"). PRD §17.6 is now the source of truth; the code is out of compliance.

**Pros.** Closes the AI-slop hard-rule violation; gives Crafty a real visual identity at the typography layer.
**Cons.** Blocked on font license decision (Open Q I).
**Depends on.** Open Q I (font license / substitute decision).
**Blocks.** Pass-4 design quality at launch.
**Context.** Tailwind config was written before PRD §17.2 / §17.6 were spec'd. Catch-up work.

---

## T2 — Wire automated WCAG contrast checking into CI

**What.** Small npm script that reads CSS custom properties from [crafty-app/app/globals.css](crafty-app/app/globals.css) and computes contrast ratios for token pairs in PRD §22.4. Fails CI if any pair regresses below AA. Complements existing axe-core CI (PRD §22.3).

**Why.** PRD §22.4 contrast audit is a one-time snapshot. Tokens get tweaked over time; without automation, contrast regressions ship silently.

**Pros.** Catches contrast regressions automatically; enforces §22.4 as a living contract.
**Cons.** ~Half a day eng to wire (one script + one CI step).
**Depends on.** Nothing; can be done anytime post-launch.
**Blocks.** Nothing in V1.
**Context.** Specifically guards the borderline pairs flagged in §22.4 (`--ink-subtle` on canvas, `--accent` as text).

---

## T3 — Source / commission Indian craft photography for hero anchor + community moments

**What.** Pavithran shares existing Cubbon Park meetup photos (Crafty Bengaluru WhatsApp archive). Gaps commissioned via a local Bengaluru photographer (~₹20-30k for a half-day shoot covering 5-6 craft scenes: hands-at-pottery-wheel, yarn-on-table, finished crochet, mixed crafter portrait, studio interior). Photos used in: hero anchor (PRD §7.1), community moment section (PRD §7.1), per-city editorial moments (CommunityMoment data per City — V1.5 admin curation).

**Why.** PRD §7.1 hero composition is editorial-led with full-bleed real photography — not stock, not illustration, not generic. Without real Indian craft photography, the hero falls back to typographic-only and loses the emotional warmth that distinguishes Crafty from generic SaaS.

**Pros.** Anchors brand identity; turns the homepage from directory-feel to noticeboard-feel.
**Cons.** ₹ + scheduling + photo curation effort.
**Depends on.** Open Q J (photography source).
**Blocks.** Hero quality at launch — without this, hero is weaker.
**Context.** Pavithran has organic photo archive; budget gap is small.

---

## T4 — Commission brand mark / logo icon to pair with Crafty wordmark

**What.** Brief a designer (resolves with Open Q F + H) to design a small icon mark (32-48px) that pairs with the "Crafty" wordmark in headers, favicons, and app icons. Per PRD §17.3, V1 ships wordmark-only; V1.5+ adds the mark.

**Why.** A wordmark-only identity ships fine; some brands stay wordmark-only forever. But for use cases where the wordmark doesn't fit (favicon, app launcher, social media avatar squares), a mark is needed. Plan for V1.5.

**Pros.** Completes the brand identity for non-text contexts; favicon stops being a placeholder.
**Cons.** Designer cost.
**Depends on.** Open Q F + H (designer hire).
**Blocks.** Nothing in V1; targets V1.5.
**Context.** Several known craft-themed mark archetypes: thread spool, single yarn loop, hand silhouette. Brief should preserve the warm-cream + ink-dark palette.

---

## T5 — Wire metrics infrastructure for design-doc Day-90 gates (LAUNCH-BLOCKER)

**What.** Implement the expanded event list in PRD §16.2 (added in eng review): `session_start`, `profile_view`, `profile_completed`, `signup_started`/`signup_completed` with `signup_source` UTM-tag, plus the `/admin/metrics` view computing the 6 design-doc gates. UTM tagging discipline: every Rahul-WhatsApp message uses `?utm_source=whatsapp&utm_medium=curator`; Insta link-in-bio uses `?utm_source=insta`.

**Why.** The design doc gates Day-90 success on 5 concrete metrics (self-serve count ≥100, activation ≥60%, D30 ≥35%, profile-CTR >15%, second-page-views >35%, direct-traffic >20%). Without UTM-tagged signups + profile_completed event firing on first build, the self-serve gate is unrecoverable. PostHog events that aren't fired from day 1 cannot be backfilled.

**Pros.** Day-90 review becomes data-driven, not vibes. Catches broken funnel early (e.g., "Insta drives 5K MAU but 0 signups → CTA copy is broken").
**Cons.** ~3-4 hr eng to wire all events + admin view; UTM discipline requires ops habit (Rahul + SiC must use tagged URLs).
**Depends on.** Nothing.
**Blocks.** Day-90 decision gate honesty.
**Context.** Outside-voice F5 from eng review 2026-05-02. Internal review's PostHog event list (PRD §16.2 original draft) was missing 4 of the 6 events needed for the design doc's metrics. PRD §16.2 has been updated to reflect the expanded list.

---

## T6 — Acquisition math reality-check before launch

**What.** Validate the 5K MAU 90-day target against funnel realism. Insta link-in-bio CTR is typically 1-3%; @craftymeets has 10K followers; realistic Insta→site ≈ 300-500 unique visitors/month. WhatsApp broadcast adds ~150-300 visitors/month. To reach 5K MAU, either (a) extend the timeline to 6 months, or (b) commit to paid acquisition budget, or (c) restate the goal.

**Why.** The 5K MAU number invites a missed-target post-mortem at Day 90 even if all qualitative signals are strong. Better to set a defensible goal up front.

**Pros.** Founder + investor honesty; avoids a misframed Day-90 narrative.
**Cons.** Founder may resist target reduction; may lose external pressure that drives growth.
**Depends on.** Founder funnel data audit (existing @craftymeets analytics).
**Blocks.** Investor / community framing of Day-90 results.
**Context.** Outside-voice F6.

---

## T7 — Formalize Second-in-Command (SiC) admin role + responsibilities

**What.** PRD §12.4 currently hard-codes `pavithran7777@gmail.com` as the sole bootstrapped admin. Add a Week 4 SiC deliverable: a second admin user seeded (sub-group lead from the 8 WhatsApp groups), with a written runbook in `docs/operations.md` covering: weekly Reel cadence, curator entry quota, takedown decision authority when Rahul unavailable, moderation triage SLA. Per design doc spec.

**Why.** The design doc explicitly flagged founder-bottleneck as the top risk and committed Week 4 SiC identification as the mitigation. Without it, the launch ships with all moderation, content, and curator workflows routed through Rahul — exactly the risk pattern the design doc warned against.

**Pros.** Mitigates the design doc's #1 risk concretely.
**Cons.** Requires Rahul to commit to power-sharing; SiC needs onboarding time.
**Depends on.** Founder identifies SiC by Week 4 deadline.
**Blocks.** Definition-of-Done line "At least 1 Reel + 1 curator entry produced by SiC."
**Context.** Outside-voice F7. Already in design doc; just absent from the PRD spec until now.

---

## Notes

- Items above are sorted roughly by urgency. T1 + T5 + T7 are launch-blockers / launch-shapers. T2-T4 + T6 are valuable but not gating.
- All items trace to either PRD Open Questions (§28.2) or outside-voice findings (eng review 2026-05-02).
- T1 (font fix) escalated by outside-voice F10: if ABC license is a multi-week procurement, decide free pairing (Fraunces + Inter) Week 0 and unblock.
- This file should be added to `.gitignore` if the team prefers TODOs in a tracker (Linear / GitHub Issues) — keep here for now since the project is solo-founder phase.
