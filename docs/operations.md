# Crafty — Operations Runbook

Operational playbook for the Crafty admins (founder + Second-in-Command).
Source-of-truth document for SLAs, weekly cadence, takedown authority, and
escalation paths. Updated as we ramp.

> **Status:** Draft v1, 2026-05-23. Filed as part of T7 (PRD §12.4 + design
> doc risk #1: founder-bottleneck mitigation).

---

## 1. Roles

| Role | Person | Scope |
|---|---|---|
| **Founder / Primary admin** | Pavithran (`pavithran7777@gmail.com`) | All admin actions. Final authority on disputes. |
| **Second-in-Command (SiC)** | _TBD — set `SIC_ADMIN_EMAIL` env_ | All admin actions. Acts in founder's absence. |
| **Curator** | Rahul (founder of the Cubbon meetups) | Pre-populates listings via the admin UI. Does NOT moderate. |

**Why two admins:** the design doc flagged founder-bottleneck as the #1 launch
risk. The SiC exists so moderation, content takedowns, and curator onboarding
never wait on a single person. PRD §12.4 specifies the SiC bootstrap; this
runbook defines what the SiC actually does day to day.

---

## 2. Moderation triage SLA

The `/admin/flags` queue is the front door. Founder and SiC share the queue.

| Severity | Definition | Triage target | Resolution target |
|---|---|---|---|
| **P0 — Critical** | CSAM, doxxing, credible threat, illegal goods. | Within **2 hours** of report | Hide immediately. Notify counterpart. Reach out to user only after takedown. |
| **P1 — High** | Hate speech, harassment, scam/fraud claim, copyright (DMCA-style). | Within **24 hours** | Hide pending review; restore if cleared. Reply to reporter within 48h. |
| **P2 — Standard** | "Inappropriate", "misleading", "spam" without clear escalation. | Within **48 hours** | Dismiss / Hide / Delete per judgment. No reporter reply required. |
| **P3 — Low** | "Other" reasons, ambiguous reports. | Weekly sweep | Bulk decision during weekly review. |

**Working assumption:** if either admin sees a P0/P1, they act unilaterally and
notify the other in WhatsApp. No quorum required — speed beats consensus when
something genuinely harmful is up.

### Takedown authority when founder unavailable

The SiC has **full takedown authority** on P0–P2 issues without escalation.
For P3 ambiguous cases, the SiC may either decide solo or wait for the weekly
review. Founder reserves the right to reverse a SiC takedown but must do so
within 72 hours; otherwise the SiC decision is final.

---

## 3. Curator (Rahul) workflow

Rahul pre-populates listings for craft community members who haven't signed up
yet. He's an admin-adjacent curator, not a moderator.

### Quotas
- **Target:** ≥ 5 curator entries per week during ramp (Weeks 0–12).
- **Floor:** ≥ 2 per week. Anything less is a signal that the curator program
  needs attention.
- Entries are tracked in `/admin/listings` by filtering for `is_claimed=false`
  and ordering by `created_at`.

### Claim invitation
- Curator entry creates an unclaimed listing (`is_claimed=false`).
- Public page shows a "claim this listing" notice.
- Owner emails `hello@crafty.app` → founder or SiC opens
  `/admin/listings/[id]/transfer-ownership` (PRD §8.7) and links the listing
  to the owner's Clerk email.
- System sends a Resend invite ("You've been linked to your Crafty store") —
  see [PRD §15](../PRD/Crafty-PRD-v1.md) once Resend is wired (currently not).

---

## 4. Weekly cadence

Owned by founder; SiC covers any week the founder is unavailable.

| Day | Task | Notes |
|---|---|---|
| **Mon** | Reel published on `@craftymeets` | One per week minimum. Featured crafter or community moment. UTM-tagged: `?utm_source=insta&utm_medium=reel&utm_campaign=weekly`. |
| **Tue** | WhatsApp broadcast to the 8 craft groups | Featured listing + this week's events. UTM: `?utm_source=whatsapp&utm_medium=broadcast`. |
| **Wed** | Curator review (Rahul + admin) | Walk the queue, confirm 5+ entries landed last week. |
| **Thu** | Flag queue sweep | P3 batch decisions. Restore false positives if any. |
| **Fri** | Metrics check (once T5 ships) | Open `/admin/metrics`. Note any week-over-week regression in funnel. |
| **Sun** | Cubbon meetup | Photos for next week's Reel + curator candidates. |

### Day-1 SiC deliverable

Per the design doc Definition-of-Done: at least 1 Reel and 1 curator entry
must be produced by the SiC (not the founder) by Week 4. This proves the
delegation works in practice, not just on paper.

---

## 5. Escalation paths

- **User reports a P0 issue and neither admin responds within 4 hours**:
  founder is paged via WhatsApp direct message. If founder unreachable for
  another 4 hours, SiC takes the call alone and notifies founder afterward.
- **A creator disputes a takedown**: open a thread in the founder's email,
  CC SiC. Decision made jointly within 48 hours.
- **Press / legal contact**: founder only. SiC does not represent Crafty
  externally without explicit handoff.

---

## 6. What the SiC does NOT do (yet)

- **Promote/demote other admins** — founder only until further notice.
- **Modify cities/categories** — founder only (visible to all users, harder
  to roll back).
- **Run CSV exports** — founder only (data privacy, contains buyer emails).

These restrictions are enforced socially today; in code they're not
distinguished from "admin" permissions. Tighten in V1.5 if needed.

---

## 7. Maintenance

- Update this doc on any policy change.
- Re-read at quarterly retro to check SLAs against actual response times.
- When the SiC is named, replace the `TBD` row in §1 and set
  `SIC_ADMIN_EMAIL` / `SIC_ADMIN_NAME` in `.env`.
