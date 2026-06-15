"use server";

// PRD §24.2 — admin row-level actions for /admin/listings.
// Plus PRD §8.7 — transfer-ownership flow for unclaimed listings.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendClaimConfirm } from "@/lib/email";
import { logAudit, type AuditEntityType } from "@/lib/audit";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type Kind = "crafter" | "store" | "studio" | "event";

const KIND_TO_AUDIT: Record<Kind, AuditEntityType> = {
  crafter: "CRAFTER", store: "STORE", studio: "STUDIO", event: "EVENT",
};

async function loadEntity(kind: Kind, id: string) {
  if (kind === "crafter") return prisma.crafter.findUnique({ where: { id }, include: { city: true } });
  if (kind === "store") return prisma.store.findUnique({ where: { id }, include: { city: true } });
  if (kind === "studio") return prisma.studio.findUnique({ where: { id }, include: { city: true } });
  return prisma.event.findUnique({ where: { id }, include: { city: true } });
}

function publicUrl(kind: Kind, citySlug: string, slug: string): string {
  const segment = kind === "crafter" ? "crafters" : kind === "store" ? "stores" : kind === "studio" ? "learn" : "events";
  return `${SITE_URL}/${citySlug}/${segment}/${slug}`;
}

export async function toggleFeatured(kind: Kind, id: string) {
  const admin = await requireAdmin();
  const entity = await loadEntity(kind, id);
  if (!entity) return;
  const next = !entity.is_featured;
  const data = { is_featured: next };
  if (kind === "crafter") await prisma.crafter.update({ where: { id }, data });
  if (kind === "store") await prisma.store.update({ where: { id }, data });
  if (kind === "studio") await prisma.studio.update({ where: { id }, data });
  if (kind === "event") await prisma.event.update({ where: { id }, data });
  void logAudit({
    actorUserId: admin.id,
    action: next ? `${kind}.feature` : `${kind}.unfeature`,
    entityType: KIND_TO_AUDIT[kind],
    entityId: id,
  });
  revalidatePath("/admin/listings");
  revalidatePath(`/${entity.city.slug}`);
}

export async function setStatus(kind: Kind, id: string, status: "PUBLISHED" | "HIDDEN" | "DELETED") {
  const admin = await requireAdmin();
  const entity = await loadEntity(kind, id);
  if (!entity) return;
  // Keep deleted_at consistent with status: set it only for DELETED, clear it
  // for every other status (PUBLISHED *and* HIDDEN) so a restored/hidden row
  // never carries a stale deletion timestamp.
  const data: Record<string, unknown> = {
    status,
    deleted_at: status === "DELETED" ? new Date() : null,
  };
  if (kind === "crafter") await prisma.crafter.update({ where: { id }, data });
  if (kind === "store") await prisma.store.update({ where: { id }, data });
  if (kind === "studio") await prisma.studio.update({ where: { id }, data });
  if (kind === "event") await prisma.event.update({ where: { id }, data });
  void logAudit({
    actorUserId: admin.id,
    action: `${kind}.${status.toLowerCase()}`,
    entityType: KIND_TO_AUDIT[kind],
    entityId: id,
  });
  revalidatePath("/admin/listings");
  revalidatePath(`/${entity.city.slug}`);
}

// PRD §8.7 — admin pre-populates a listing → links it to the real owner's email.
// If the email has no User row yet, we create one (role CREATOR) so the owner
// can sign in via Descope + lazy-upsert later and immediately own the listing.
export async function transferOwnership(kind: Kind, id: string, formData: FormData) {
  const admin = await requireAdmin();
  const email = (formData.get("email") ?? "").toString().trim().toLowerCase();
  if (!email || !email.includes("@")) return;

  const owner = await prisma.user.upsert({
    where: { email },
    create: { email, role: "CREATOR" },
    update: { role: "CREATOR" },
    select: { id: true, email: true },
  });

  const entity = await loadEntity(kind, id);
  if (!entity) return;

  if (kind === "crafter") await prisma.crafter.update({ where: { id }, data: { owner_user_id: owner.id, is_claimed: true } });
  if (kind === "store")   await prisma.store.update({   where: { id }, data: { owner_user_id: owner.id, is_claimed: true } });
  if (kind === "studio")  await prisma.studio.update({  where: { id }, data: { owner_user_id: owner.id, is_claimed: true } });
  if (kind === "event")   await prisma.event.update({   where: { id }, data: { organizer_user_id: owner.id } });

  void sendClaimConfirm({
    to: owner.email,
    storeName: (entity as any).name,
    publicUrl: publicUrl(kind, entity.city.slug, (entity as any).slug),
  });

  void logAudit({
    actorUserId: admin.id,
    action: `${kind}.transfer_ownership`,
    entityType: KIND_TO_AUDIT[kind],
    entityId: id,
    metadata: { to_user_id: owner.id, to_email: email },
  });

  revalidatePath("/admin/listings");
  revalidatePath(`/${entity.city.slug}`);
}
