// V3 Tier 4 — Marketing automation: re-engagement email templates.
//
// Tier 4 ships THIS as the V3 idempotency model: the cron skips users whose
// User.updated_at was bumped in the last 7 days (a proxy for "we just sent
// them something / they engaged"). No new schema. The founder can tighten
// this in V3.1 with a dedicated lifecycle_emails_sent table once the segment
// sizes are large enough to need fine-grained dedupe.
//
// All three sends route through lib/email.ts's sendEmail() via the Resend
// wrapper, so they no-op cleanly in dev (placeholder RESEND_API_KEY).
//
// Since sendEmail is module-private inside lib/email.ts, we reuse the
// existing `sendListingLive` template's wrapper indirectly by writing thin
// HTML ourselves and calling our own tiny send helper — but to stay
// consistent with the codebase, we delegate to Resend through a local
// helper that mirrors lib/email.ts's no-op pattern.

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDR = process.env.RESEND_FROM || "Crafty <hello@crafty.app>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const _resend =
  RESEND_API_KEY && !RESEND_API_KEY.startsWith("re_placeholder")
    ? new Resend(RESEND_API_KEY)
    : null;

type SendArgs = { to: string; subject: string; html: string; text?: string };

async function send(args: SendArgs): Promise<{ id: string | null }> {
  if (!_resend) {
    console.log(
      `[email:lifecycle:noop] to=${args.to} subject="${args.subject}"`,
    );
    return { id: null };
  }
  try {
    const res = await _resend.emails.send({
      from: FROM_ADDR,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    return { id: res.data?.id ?? null };
  } catch (e) {
    console.error("[email:lifecycle:error]", e);
    return { id: null };
  }
}

function wrap(body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: Inter, system-ui, sans-serif; color: #171614; max-width: 560px; margin: 0 auto; padding: 24px; line-height: 1.5; }
  .cta { display: inline-block; background: #FF90E8; color: #171614; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 8px 0; }
  p { margin: 12px 0; }
  a { color: #171614; }
</style>
</head><body>${body}</body></html>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c,
  );
}

// ─── Templates ─────────────────────────────────────────────────────

export async function sendLapsedCreatorReengagement(args: {
  to: string;
  firstName?: string | null;
  daysSinceListing: number;
}) {
  const name = args.firstName || "there";
  return send({
    to: args.to,
    subject: "Your Crafty listing could use a refresh",
    html: wrap(`
      <p>Hi ${esc(name)},</p>
      <p>It's been ${args.daysSinceListing} days since you updated your Crafty listing. A few quick edits — new photos, updated pricing, fresh tagline — usually doubles the saves we see in the next week.</p>
      <p><a href="${SITE_URL}/dashboard" class="cta">Update my listing</a></p>
      <p>If you don't have time today, even bumping one photo helps your listing rank fresh in search.</p>
      <p>— The Crafty team</p>
    `),
    text: `Hi ${name},\n\nIt's been ${args.daysSinceListing} days since you updated your Crafty listing. A few quick edits go a long way.\n\nUpdate: ${SITE_URL}/dashboard\n\n— The Crafty team`,
  });
}

export async function sendInactiveBuyerWinback(args: {
  to: string;
  firstName?: string | null;
  lastSeenDate: Date;
}) {
  const name = args.firstName || "there";
  const days = Math.max(
    1,
    Math.round((Date.now() - args.lastSeenDate.getTime()) / (1000 * 60 * 60 * 24)),
  );
  return send({
    to: args.to,
    subject: "New crafters in your city, since you last visited",
    html: wrap(`
      <p>Hi ${esc(name)},</p>
      <p>It's been ${days} days since you visited Crafty — and a lot has changed. There are new crafters, stores, and studios in your city worth a look.</p>
      <p><a href="${SITE_URL}/" class="cta">See what's new</a></p>
      <p>— The Crafty team</p>
    `),
    text: `Hi ${name},\n\nIt's been ${days} days since you visited Crafty — see what's new in your city.\n\n${SITE_URL}/\n\n— The Crafty team`,
  });
}

export async function sendCreatorNoListing(args: {
  to: string;
  firstName?: string | null;
}) {
  const name = args.firstName || "there";
  return send({
    to: args.to,
    subject: "Your Crafty listing — 5 minutes to go live",
    html: wrap(`
      <p>Hi ${esc(name)},</p>
      <p>You signed up for Crafty but haven't published a listing yet. It takes about 5 minutes — pick a category, drop in a photo, write a one-line tagline, and you're discoverable in your city.</p>
      <p><a href="${SITE_URL}/list-your-profile" class="cta">List my profile</a></p>
      <p>Need help? Reply to this email and we'll walk you through it.</p>
      <p>— The Crafty team</p>
    `),
    text: `Hi ${name},\n\nYou signed up for Crafty but haven't published a listing yet. It only takes 5 minutes.\n\nGet started: ${SITE_URL}/list-your-profile\n\n— The Crafty team`,
  });
}
