// saved-item-notifications — daily "makers you saved have something new" digest.
//
// For each buyer, scans the crafters/stores/studios they SAVED for activity
// (a new PUBLISHED product, or a new upcoming event they organize) created
// after that save's watermark (last_notified_at ?? created_at), and sends ONE
// batched email. The contributing saves' last_notified_at is advanced so the
// same activity never reports twice. Strictly buyer-facing; no popularity
// counts. Best-effort email, honoring email_bounced.
//
// Auth: shared CRON_SECRET (Authorization: Bearer ... or ?token=).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cronSecretMatches } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SEGMENT = { CRAFTER: "crafters", STORE: "stores", STUDIO: "learn" } as const;
const FK = { CRAFTER: "crafter_id", STORE: "store_id", STUDIO: "studio_id" } as const;
const ORG_FK = { CRAFTER: "organizer_crafter_id", STORE: "organizer_store_id", STUDIO: "organizer_studio_id" } as const;
const MAX_ITEMS_PER_USER = 12;

type MakerKind = "CRAFTER" | "STORE" | "STUDIO";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("token");
  if (!secret || secret.startsWith("placeholder")) {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (!cronSecretMatches(provided, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // All saved makers (crafter/store/studio), with the saver's contact info.
  const saves = await prisma.save.findMany({
    where: { entity_type: { in: ["CRAFTER", "STORE", "STUDIO"] } },
    include: { user: { select: { id: true, email: true, display_name: true, email_bounced: true } } },
  });

  // Batch-load the saved entities' display metadata (name/slug/city) so the
  // per-save freshness scan doesn't also N+1 the entity rows.
  const idsByKind: Record<MakerKind, string[]> = { CRAFTER: [], STORE: [], STUDIO: [] };
  for (const s of saves) idsByKind[s.entity_type as MakerKind].push(s.entity_id);
  const meta = new Map<string, { name: string; slug: string; citySlug: string }>();
  const loaders: Array<Promise<void>> = [];
  const loadMeta = async (kind: MakerKind) => {
    const ids = Array.from(new Set(idsByKind[kind]));
    if (ids.length === 0) return;
    const rows =
      kind === "CRAFTER"
        ? await prisma.crafter.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, slug: true, city: { select: { slug: true } } } })
        : kind === "STORE"
          ? await prisma.store.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, slug: true, city: { select: { slug: true } } } })
          : await prisma.studio.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, slug: true, city: { select: { slug: true } } } });
    for (const r of rows) meta.set(`${kind}:${r.id}`, { name: r.name, slug: r.slug, citySlug: r.city.slug });
  };
  (["CRAFTER", "STORE", "STUDIO"] as MakerKind[]).forEach((k) => loaders.push(loadMeta(k)));
  await Promise.all(loaders);

  // Per user: collect fresh items + the saves that contributed (to advance).
  type Item = { name: string; what: string; url: string };
  const perUser = new Map<string, { email: string; firstName: string | null; items: Item[]; contributorSaveIds: string[] }>();

  for (const s of saves) {
    if (!s.user.email || s.user.email_bounced) continue;
    const kind = s.entity_type as MakerKind;
    const m = meta.get(`${kind}:${s.entity_id}`);
    if (!m) continue; // saved entity no longer published/exists
    const since = s.last_notified_at ?? s.created_at;
    const entityUrl = `${SITE_URL}/${m.citySlug}/${SEGMENT[kind]}/${m.slug}`;

    const [newProducts, newEvents] = await Promise.all([
      prisma.product.findMany({
        where: { status: "PUBLISHED", created_at: { gt: since }, [FK[kind]]: s.entity_id },
        select: { name: true },
        orderBy: { created_at: "desc" },
        take: 5,
      }),
      prisma.event.findMany({
        where: { status: "PUBLISHED", end_at: { gte: now }, created_at: { gt: since }, [ORG_FK[kind]]: s.entity_id },
        select: { name: true, slug: true, city: { select: { slug: true } } },
        orderBy: { created_at: "desc" },
        take: 5,
      }),
    ]);

    if (newProducts.length === 0 && newEvents.length === 0) continue;

    const bucket = perUser.get(s.user.id) ?? { email: s.user.email, firstName: s.user.display_name, items: [], contributorSaveIds: [] };
    for (const p of newProducts) bucket.items.push({ name: m.name, what: `listed a new item: ${p.name}`, url: entityUrl });
    for (const e of newEvents) bucket.items.push({ name: m.name, what: `is hosting ${e.name}`, url: `${SITE_URL}/${e.city.slug}/events/${e.slug}` });
    bucket.contributorSaveIds.push(s.id);
    perUser.set(s.user.id, bucket);
  }

  // Send one digest per user, then advance the contributing saves' watermark.
  let emailed = 0;
  if (perUser.size > 0) {
    const { sendSavedUpdatesDigest } = await import("@/lib/email");
    for (const [, b] of perUser) {
      void sendSavedUpdatesDigest({
        to: b.email,
        firstName: b.firstName,
        items: b.items.slice(0, MAX_ITEMS_PER_USER),
      });
      await prisma.save.updateMany({
        where: { id: { in: b.contributorSaveIds } },
        data: { last_notified_at: now },
      });
      emailed++;
    }
  }

  await prisma.cronRun.create({ data: { job_name: "saved_listing_updates", status: "success", completed_at: new Date(), rows_affected: emailed } }).catch((e) => console.error("[cron] record", e));
  return NextResponse.json({ ok: true, savesScanned: saves.length, emailed });
}
