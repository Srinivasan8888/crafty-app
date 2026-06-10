// V3 Tier 4 — admin PATCH for a ClaimRequest. Three actions:
//   approve  — flip listing owner_user_id, promote VISITOR → CREATOR,
//              set status APPROVED, send sendClaimConfirm.
//   reject   — status REJECTED, polite email back.
//   withdraw — status WITHDRAWN (claimant or admin asked to back off).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";
import { logAudit } from "@/lib/audit";
import { sendClaimConfirm } from "@/lib/email";

export const runtime = "nodejs";

const ApproveSchema = z.object({
  action: z.literal("approve"),
  /** Existing user id to assign as owner. */
  approved_user_id: z.string().min(1).max(40).optional(),
  /** Or email — we create/find a User row. */
  approved_user_email: z.string().email().max(120).optional(),
  admin_note: z.string().max(1000).optional(),
});
const RejectSchema = z.object({
  action: z.literal("reject"),
  admin_note: z.string().max(1000).optional(),
});
const WithdrawSchema = z.object({
  action: z.literal("withdraw"),
  admin_note: z.string().max(1000).optional(),
});
const Schema = z.discriminatedUnion("action", [ApproveSchema, RejectSchema, WithdrawSchema]);

const SEGMENT: Record<string, string> = { CRAFTER: "crafters", STORE: "stores", STUDIO: "learn" };

async function loadEntity(kind: "CRAFTER" | "STORE" | "STUDIO", id: string) {
  if (kind === "CRAFTER") return prisma.crafter.findUnique({ where: { id }, select: { id: true, name: true, slug: true, city: { select: { slug: true } } } });
  if (kind === "STORE")   return prisma.store.findUnique({ where: { id }, select: { id: true, name: true, slug: true, city: { select: { slug: true } } } });
  return prisma.studio.findUnique({ where: { id }, select: { id: true, name: true, slug: true, city: { select: { slug: true } } } });
}

async function transferOwnership(kind: "CRAFTER" | "STORE" | "STUDIO", id: string, newOwnerId: string) {
  const data = { owner_user_id: newOwnerId, is_claimed: true };
  if (kind === "CRAFTER") return prisma.crafter.update({ where: { id }, data });
  if (kind === "STORE")   return prisma.store.update({ where: { id }, data });
  return prisma.studio.update({ where: { id }, data });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  let admin;
  try { admin = await requireAdmin(); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const claim = await prisma.claimRequest.findUnique({ where: { id: params.id } });
  if (!claim) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (body.action === "reject") {
    await prisma.claimRequest.update({
      where: { id: claim.id },
      data: {
        status: "REJECTED",
        resolved_at: new Date(),
        resolved_by_admin_id: admin.id,
        admin_note: body.admin_note ?? null,
      },
    });
    void logAudit({
      actorUserId: admin.id, action: "claim_request.reject",
      entityType: "USER", entityId: claim.id, metadata: { admin_note: body.admin_note },
    });
    // Polite email reply
    void sendClaimRejectEmail(claim.claimant_email);
    revalidatePath("/admin/claim-requests");
    return NextResponse.json({ ok: true });
  }

  if (body.action === "withdraw") {
    await prisma.claimRequest.update({
      where: { id: claim.id },
      data: {
        status: "WITHDRAWN",
        resolved_at: new Date(),
        resolved_by_admin_id: admin.id,
        admin_note: body.admin_note ?? null,
      },
    });
    void logAudit({
      actorUserId: admin.id, action: "claim_request.withdraw",
      entityType: "USER", entityId: claim.id, metadata: { admin_note: body.admin_note },
    });
    revalidatePath("/admin/claim-requests");
    return NextResponse.json({ ok: true });
  }

  // body.action === "approve"
  if (!body.approved_user_id && !body.approved_user_email) {
    return NextResponse.json({ error: "approve_requires_user" }, { status: 400 });
  }
  const entity = await loadEntity(claim.entity_type as any, claim.entity_id);
  if (!entity) return NextResponse.json({ error: "entity_not_found" }, { status: 404 });

  // Resolve the target user.
  let targetUserId: string;
  if (body.approved_user_id) {
    const u = await prisma.user.findUnique({ where: { id: body.approved_user_id }, select: { id: true, role: true } });
    if (!u) return NextResponse.json({ error: "approved_user_not_found" }, { status: 404 });
    targetUserId = u.id;
    if (u.role === "VISITOR") {
      await prisma.user.update({ where: { id: u.id }, data: { role: "CREATOR" } });
    }
  } else {
    const email = body.approved_user_email!;
    const upserted = await prisma.user.upsert({
      where: { email },
      create: { email, role: "CREATOR" },
      update: {},
      select: { id: true, role: true },
    });
    targetUserId = upserted.id;
    if (upserted.role === "VISITOR") {
      await prisma.user.update({ where: { id: upserted.id }, data: { role: "CREATOR" } });
    }
  }

  await transferOwnership(claim.entity_type as any, claim.entity_id, targetUserId);

  await prisma.claimRequest.update({
    where: { id: claim.id },
    data: {
      status: "APPROVED",
      approved_user_id: targetUserId,
      resolved_at: new Date(),
      resolved_by_admin_id: admin.id,
      admin_note: body.admin_note ?? null,
    },
  });

  void logAudit({
    actorUserId: admin.id, action: "claim_request.approve",
    entityType: claim.entity_type as any,
    entityId: claim.entity_id,
    metadata: { claim_id: claim.id, new_owner_user_id: targetUserId },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const publicUrl = entity.city?.slug
    ? `${siteUrl}/${entity.city.slug}/${SEGMENT[claim.entity_type]}/${entity.slug}`
    : siteUrl;
  void sendClaimConfirm({
    to: claim.claimant_email,
    storeName: entity.name,
    publicUrl,
  });

  revalidatePath("/admin/claim-requests");
  if (entity.city?.slug) {
    revalidatePath(`/${entity.city.slug}/${SEGMENT[claim.entity_type]}/${entity.slug}`);
  }
  return NextResponse.json({ ok: true, new_owner_user_id: targetUserId });
}

async function sendClaimRejectEmail(to: string) {
  try {
    const { Resend } = await import("resend");
    const key = process.env.RESEND_API_KEY;
    if (!key || key.startsWith("re_placeholder")) {
      console.log(`[email:noop] claim reject -> ${to}`);
      return;
    }
    const resend = new Resend(key);
    await resend.emails.send({
      from: process.env.RESEND_FROM || "Crafty <hello@crafty.app>",
      to,
      subject: "About your Crafty listing claim",
      html: `
        <p>Hi there,</p>
        <p>Thanks for reaching out about claiming a listing on Crafty.</p>
        <p>Unfortunately we weren&rsquo;t able to approve this claim right now. If you think this was a mistake, just reply to this email and tell us more — we&rsquo;re happy to discuss.</p>
        <p>— The Crafty team</p>
      `,
    });
  } catch (e) {
    console.error("[claim-reject email] failed", e);
  }
}
