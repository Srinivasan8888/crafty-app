// V3 Tier 4 — public claim-listing endpoint.
//
// No auth required (this is the flow for someone who *isn't yet* the owner
// to ask to become one). We rate-limit aggressively, reject already-claimed
// listings, and email the founder for review.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { phoneNumber } from "@/lib/phone";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

const Schema = z.object({
  entity_type: z.enum(["CRAFTER", "STORE", "STUDIO"]),
  entity_id: z.string().min(1).max(40),
  claimant_email: z.string().email().max(120),
  claimant_phone: phoneNumber.optional().nullable(),
  claimant_name: z.string().max(80).optional().nullable(),
  message: z.string().min(10).max(2000),
});

async function loadEntity(kind: "CRAFTER" | "STORE" | "STUDIO", id: string) {
  if (kind === "CRAFTER") return prisma.crafter.findUnique({ where: { id }, select: { id: true, name: true, is_claimed: true, slug: true, city: { select: { slug: true } } } });
  if (kind === "STORE")   return prisma.store.findUnique({ where: { id }, select: { id: true, name: true, is_claimed: true, slug: true, city: { select: { slug: true } } } });
  return prisma.studio.findUnique({ where: { id }, select: { id: true, name: true, is_claimed: true, slug: true, city: { select: { slug: true } } } });
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }
  // Heavier limit than flags — claim spam is high-value spam.
  const rl = await rateLimit(req, "claim-requests", 5);
  if (!rl.allowed) {
    const retry = Math.ceil(rl.resetIn / 1000);
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const entity = await loadEntity(data.entity_type, data.entity_id);
  if (!entity) {
    return NextResponse.json({ error: "entity_not_found" }, { status: 404 });
  }
  if (entity.is_claimed) {
    return NextResponse.json({ error: "already_claimed" }, { status: 400 });
  }

  const created = await prisma.claimRequest.create({
    data: {
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      claimant_email: data.claimant_email,
      claimant_phone: data.claimant_phone ?? null,
      claimant_name: data.claimant_name ?? null,
      message: data.message,
    },
    select: { id: true },
  });

  // Fire-and-forget admin notification.
  void notifyAdmin({
    requestId: created.id,
    entityType: data.entity_type,
    entityName: entity.name,
    citySlug: entity.city?.slug ?? null,
    entitySlug: entity.slug,
    claimantEmail: data.claimant_email,
    claimantName: data.claimant_name ?? null,
    message: data.message,
  });

  return NextResponse.json({ id: created.id, ok: true }, { status: 201 });
}

async function notifyAdmin(args: {
  requestId: string;
  entityType: string;
  entityName: string;
  citySlug: string | null;
  entitySlug: string;
  claimantEmail: string;
  claimantName: string | null;
  message: string;
}) {
  try {
    // Reuse the existing sendListingLive plumbing as a thin wrapper that
    // just sends an HTML email; the template here is inlined.
    const { Resend } = await import("resend");
    const key = process.env.RESEND_API_KEY;
    if (!key || key.startsWith("re_placeholder")) {
      console.log(`[email:noop] claim request ${args.requestId} for ${args.entityType} ${args.entityName} from ${args.claimantEmail}`);
      return;
    }
    const resend = new Resend(key);
    const adminEmail = process.env.ADMIN_EMAIL ?? "pavithran7777@gmail.com";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const listingUrl = args.citySlug
      ? `${siteUrl}/${args.citySlug}/${args.entityType === "CRAFTER" ? "crafters" : args.entityType === "STORE" ? "stores" : "learn"}/${args.entitySlug}`
      : siteUrl;

    await resend.emails.send({
      from: process.env.RESEND_FROM || "Crafty <hello@crafty.app>",
      to: adminEmail,
      subject: `Claim request: ${args.entityName}`,
      html: `
        <p>New claim request:</p>
        <ul>
          <li><strong>Listing:</strong> ${escape(args.entityName)} (${args.entityType})</li>
          <li><strong>Claimant:</strong> ${escape(args.claimantName ?? "—")} &lt;${escape(args.claimantEmail)}&gt;</li>
        </ul>
        <p><strong>Message:</strong></p>
        <blockquote>${escape(args.message).replace(/\n/g, "<br/>")}</blockquote>
        <p>
          <a href="${siteUrl}/admin/claim-requests">Open admin queue</a>
          &middot;
          <a href="${listingUrl}">View listing</a>
        </p>
      `,
    });
  } catch (e) {
    console.error("[claim-requests] admin notify failed", e);
  }
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}
