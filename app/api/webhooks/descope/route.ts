// PRD §12.1 — Descope audit-webhook receiver.
//
// Migrated from Clerk's Svix-signed webhook on 2026-05-24. Same purpose:
// proactively sync Descope user lifecycle (created / modified / deleted) into
// the local User table. Lazy upsert in lib/auth.ts remains the authoritative
// path; this handler is a best-effort sync to keep the cache warm.
//
// Signature scheme (per Descope's HMAC docs):
//   - Header:   x-descope-webhook-s256
//   - Algo:     HMAC-SHA256
//   - Body:     JSON.stringify(payload) — NOT the raw request body
//   - Digest:   base64
//
// Configure in Descope console → Connectors → Audit Webhook. Set the URL to
// https://<your-domain>/api/webhooks/descope, filter to User events, and paste
// the shared secret into DESCOPE_WEBHOOK_SECRET.

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// Descope audit events use this rough shape (verified by capturing a sample
// payload on first deploy). The User events carry the affected user under
// `data.user` with userId / loginIds / email.
type DescopeAuditEvent = {
  action?: string;        // "User Created" | "User Modified" | "User Deleted" | ...
  tenant?: string;
  occurred?: string;      // ISO
  actorId?: string;
  data?: {
    user?: {
      userId?: string;
      loginIds?: string[];
      email?: string;
      name?: string;
      picture?: string;
    };
    userId?: string;      // present on delete events instead of nested user
  };
};

function verifySignature(
  secret: string,
  rawBody: string,
  parsed: unknown,
  sentSig: string | null,
): boolean {
  if (!sentSig) return false;
  const sent = Buffer.from(sentSig);
  // HMAC should be over the raw transmitted bytes, but this integration was
  // originally written to verify JSON.stringify(payload). Whichever form Descope
  // actually signs, accept it — both still require the shared secret, so this
  // closes the "valid webhook silently rejected" risk without breaking a
  // working config. (Raw is checked first.)
  for (const candidate of [rawBody, JSON.stringify(parsed)]) {
    const buf = Buffer.from(
      crypto.createHmac("sha256", secret).update(candidate).digest("base64"),
    );
    try {
      if (sent.length === buf.length && crypto.timingSafeEqual(sent, buf)) return true;
    } catch {
      // length mismatch / bad encoding — try the next candidate
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  const secret = process.env.DESCOPE_WEBHOOK_SECRET;
  if (!secret || secret === "placeholder") {
    // Fail closed when the webhook secret isn't configured — Descope wouldn't
    // be calling us anyway, but better to 503 loudly than silently accept.
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const sig = req.headers.get("x-descope-webhook-s256");
  // Read the raw body so we can HMAC the exact bytes Descope sent.
  const raw = await req.text();
  if (!raw) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!verifySignature(secret, raw, body, sig)) {
    console.error("[descope-webhook] signature verification failed");
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const evt = body as DescopeAuditEvent;
  const action = (evt.action ?? "").toLowerCase();

  try {
    if (action.includes("user created") || action.includes("user modified")) {
      const u = evt.data?.user;
      if (!u?.userId) return NextResponse.json({ ok: true, skipped: "no_userid" });
      const email = u.email ?? u.loginIds?.find((id) => id.includes("@"));
      if (!email) return NextResponse.json({ ok: true, skipped: "no_email" });

      await prisma.user.upsert({
        where: { email },
        create: {
          descope_id: u.userId,
          email,
          display_name: u.name ?? null,
          profile_photo_url: u.picture ?? null,
        },
        update: {
          descope_id: u.userId,
          display_name: u.name ?? undefined,
          profile_photo_url: u.picture ?? undefined,
        },
      });
    } else if (action.includes("user deleted")) {
      const userId = evt.data?.user?.userId ?? evt.data?.userId;
      if (!userId) return NextResponse.json({ ok: true, skipped: "no_userid" });
      // Soft-detach to preserve owned listings (cascade hard-delete would orphan
      // them). Do NOT set is_banned here: deletion is not a ban, and reusing the
      // ban flag as a delete tombstone permanently blocks the same email from
      // ever signing up again (getCurrentUser treats banned rows as anonymous).
      await prisma.user.updateMany({
        where: { descope_id: userId },
        data: { descope_id: null },
      });
    }
    // Other audit events (sign-in, sign-up flow steps, etc.) are accepted
    // silently so Descope doesn't retry them.
  } catch (e) {
    console.error("[descope-webhook] handler error", e);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
