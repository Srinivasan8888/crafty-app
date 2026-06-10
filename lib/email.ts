// PRD §15 — Transactional email via Resend.
//
// All sends go through sendEmail() which no-ops in dev (or any env without
// RESEND_API_KEY set to a real key). This keeps the rest of the codebase
// agnostic to whether email is wired up; once you paste the real key into
// .env, mails start flowing.

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDR = process.env.RESEND_FROM || "Crafty <hello@crafty.app>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const _resend =
  RESEND_API_KEY && !RESEND_API_KEY.startsWith("re_placeholder")
    ? new Resend(RESEND_API_KEY)
    : null;

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

async function sendEmail(payload: EmailPayload): Promise<{ id: string | null }> {
  if (!_resend) {
    // Dev path: log to console so engineers can see what would have been sent.
    console.log(`[email:noop] to=${payload.to} subject="${payload.subject}"`);
    return { id: null };
  }
  try {
    const res = await _resend.emails.send({
      from: FROM_ADDR,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    return { id: res.data?.id ?? null };
  } catch (e) {
    // Email is best-effort: a delivery failure should never block a
    // mutation's response. Log and move on; observability can surface it.
    console.error("[email:error]", e);
    return { id: null };
  }
}

// ─── Templates ─────────────────────────────────────────────────────

export async function sendSignupWelcome(args: { to: string; firstName?: string | null }) {
  const name = args.firstName || "there";
  return sendEmail({
    to: args.to,
    subject: "Welcome to Crafty 🌻",
    html: wrap(`
      <p>Hi ${escape(name)},</p>
      <p>Welcome to Crafty — India's craft community discovery hub.</p>
      <p>You can list your crafter profile, supply store, studio, or event in about 5 minutes.</p>
      <p><a href="${SITE_URL}/list-your-profile" class="cta">List your profile</a></p>
      <p>If you're just here to browse, that's perfect too — save the crafters you like and we'll keep your list ready in your dashboard.</p>
      <p>— Pavithran &amp; the Crafty team</p>
    `),
    text: `Hi ${name},\n\nWelcome to Crafty — India's craft community discovery hub.\n\nList your profile: ${SITE_URL}/list-your-profile\n\n— Pavithran & the Crafty team`,
  });
}

type ListingKind = "crafter" | "store" | "studio" | "event";

export async function sendListingLive(args: {
  to: string;
  firstName?: string | null;
  kind: ListingKind;
  name: string;
  publicUrl: string;
}) {
  const kindLabel = {
    crafter: "crafter profile",
    store: "supply store",
    studio: "studio",
    event: "event",
  }[args.kind];
  return sendEmail({
    to: args.to,
    subject: `Your ${kindLabel} is live on Crafty`,
    html: wrap(`
      <p>Hi ${escape(args.firstName || "there")},</p>
      <p><strong>${escape(args.name)}</strong> is now live on Crafty.</p>
      <p><a href="${args.publicUrl}" class="cta">View your ${kindLabel}</a></p>
      <p>Share the link via WhatsApp or Instagram to start getting discovered locally.</p>
      <p>— The Crafty team</p>
    `),
    text: `Hi ${args.firstName || "there"},\n\n${args.name} is now live on Crafty.\n\nView: ${args.publicUrl}\n\nShare via WhatsApp or Instagram.\n\n— The Crafty team`,
  });
}

// V3 — buyer order confirmation. Sent on payment.captured for an Order.
// Keep it brief: subject + link to the order detail page.
export async function sendOrderConfirmation(args: {
  to: string;
  firstName?: string | null;
  orderId: string;
  totalInr: number;
  invoiceNumber?: string | null;
}) {
  const orderUrl = `${SITE_URL}/dashboard/orders/${args.orderId}`;
  return sendEmail({
    to: args.to,
    subject: `Your Crafty order is confirmed${args.invoiceNumber ? ` — ${args.invoiceNumber}` : ""}`,
    html: wrap(`
      <p>Hi ${escape(args.firstName || "there")},</p>
      <p>Thanks for your order — payment received.</p>
      <p><strong>Total:</strong> ₹${args.totalInr.toLocaleString("en-IN")}${args.invoiceNumber ? `<br/><strong>Invoice:</strong> ${escape(args.invoiceNumber)}` : ""}</p>
      <p><a href="${orderUrl}" class="cta">View order</a></p>
      <p>— The Crafty team</p>
    `),
    text: `Hi ${args.firstName || "there"},\n\nThanks for your order — payment received.\nTotal: ₹${args.totalInr}\n\nView: ${orderUrl}\n\n— The Crafty team`,
  });
}

// V3 — seller "you have a new order" notification.
export async function sendSellerNewOrder(args: {
  to: string;
  firstName?: string | null;
  orderId: string;
  itemCount: number;
  payoutInr: number;
}) {
  const salesUrl = `${SITE_URL}/dashboard/sales/${args.orderId}`;
  return sendEmail({
    to: args.to,
    subject: "New order on Crafty",
    html: wrap(`
      <p>Hi ${escape(args.firstName || "there")},</p>
      <p>You have a new order — ${args.itemCount} item${args.itemCount === 1 ? "" : "s"} to fulfill.</p>
      <p><strong>Your payout:</strong> ₹${args.payoutInr.toLocaleString("en-IN")}</p>
      <p><a href="${salesUrl}" class="cta">View order</a></p>
      <p>— The Crafty team</p>
    `),
    text: `Hi ${args.firstName || "there"},\n\nYou have a new order — ${args.itemCount} item(s) to fulfill.\nPayout: ₹${args.payoutInr}\n\nView: ${salesUrl}\n\n— The Crafty team`,
  });
}

export async function sendClaimConfirm(args: {
  to: string;
  storeName: string;
  publicUrl: string;
}) {
  return sendEmail({
    to: args.to,
    subject: `You've been linked to ${args.storeName} on Crafty`,
    html: wrap(`
      <p>Hi there,</p>
      <p>An admin has linked the listing for <strong>${escape(args.storeName)}</strong> to your Crafty account.</p>
      <p>You can now manage it from your dashboard.</p>
      <p><a href="${args.publicUrl}" class="cta">View your listing</a></p>
      <p>— The Crafty team</p>
    `),
    text: `An admin has linked the listing for ${args.storeName} to your Crafty account.\n\nView: ${args.publicUrl}\n\n— The Crafty team`,
  });
}

// ─── HTML helpers ──────────────────────────────────────────────────

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

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}
