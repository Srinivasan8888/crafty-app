// V3 Tier 4 — admin queue for self-serve claim requests.

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ClaimRequestsClient } from "./ClaimRequestsClient";

export const dynamic = "force-dynamic";

const SEGMENT: Record<string, string> = { CRAFTER: "crafters", STORE: "stores", STUDIO: "learn" };

export default async function AdminClaimRequestsPage() {
  await requireAdmin();

  const rows = await prisma.claimRequest.findMany({
    orderBy: [{ created_at: "desc" }],
    take: 300,
  });

  // Sort PENDING first.
  rows.sort((a, b) => {
    if (a.status === "PENDING" && b.status !== "PENDING") return -1;
    if (a.status !== "PENDING" && b.status === "PENDING") return 1;
    return +b.created_at - +a.created_at;
  });

  // Resolve entity names + URLs for display.
  const enriched = await Promise.all(rows.map(async (r) => {
    let entityName = "(deleted)";
    let entityUrl: string | null = null;
    let isStillClaimable = false;
    const kind = r.entity_type as "CRAFTER" | "STORE" | "STUDIO";
    if (kind === "CRAFTER") {
      const c = await prisma.crafter.findUnique({ where: { id: r.entity_id }, select: { name: true, slug: true, is_claimed: true, city: { select: { slug: true } } } });
      if (c) {
        entityName = c.name;
        entityUrl = `/${c.city.slug}/${SEGMENT[kind]}/${c.slug}`;
        isStillClaimable = !c.is_claimed;
      }
    } else if (kind === "STORE") {
      const s = await prisma.store.findUnique({ where: { id: r.entity_id }, select: { name: true, slug: true, is_claimed: true, city: { select: { slug: true } } } });
      if (s) {
        entityName = s.name;
        entityUrl = `/${s.city.slug}/${SEGMENT[kind]}/${s.slug}`;
        isStillClaimable = !s.is_claimed;
      }
    } else {
      const st = await prisma.studio.findUnique({ where: { id: r.entity_id }, select: { name: true, slug: true, is_claimed: true, city: { select: { slug: true } } } });
      if (st) {
        entityName = st.name;
        entityUrl = `/${st.city.slug}/${SEGMENT[kind]}/${st.slug}`;
        isStillClaimable = !st.is_claimed;
      }
    }
    return {
      id: r.id,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      entityName,
      entityUrl,
      isStillClaimable,
      claimant_email: r.claimant_email,
      claimant_phone: r.claimant_phone,
      claimant_name: r.claimant_name,
      message: r.message,
      status: r.status,
      admin_note: r.admin_note,
      created_at: r.created_at.toISOString(),
      resolved_at: r.resolved_at?.toISOString() ?? null,
    };
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Claim requests</h1>
        <p className="mt-1 text-sm text-ink-muted">
          V3 Tier 4 — buyer-submitted requests to take ownership of unclaimed listings.
        </p>
      </div>
      <ClaimRequestsClient rows={enriched} />
    </div>
  );
}
