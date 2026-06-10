// V3 — community-page ambient-signal helper.
//
// Aggregates last-24h Save rows into city/entity-type counts. Splitting
// this out of page.tsx keeps the page itself focused on layout.

import { prisma } from "@/lib/db";

type SaveRow = { entity_type: string; entity_id: string };
type LabelMap = Map<string, string>;

async function cityLabelsFor(
  table: "crafter" | "store" | "studio" | "event",
  ids: string[],
): Promise<LabelMap> {
  if (ids.length === 0) return new Map();
  // We can't templatize prisma.<model>.findMany cleanly, so dispatch by table.
  const rows =
    table === "crafter"
      ? await prisma.crafter.findMany({
          where: { id: { in: ids } },
          select: { id: true, city: { select: { display_name: true } } },
        })
      : table === "store"
      ? await prisma.store.findMany({
          where: { id: { in: ids } },
          select: { id: true, city: { select: { display_name: true } } },
        })
      : table === "studio"
      ? await prisma.studio.findMany({
          where: { id: { in: ids } },
          select: { id: true, city: { select: { display_name: true } } },
        })
      : await prisma.event.findMany({
          where: { id: { in: ids } },
          select: { id: true, city: { select: { display_name: true } } },
        });
  return new Map(rows.map((r) => [r.id, r.city.display_name]));
}

export async function buildAmbient(
  saves: SaveRow[],
): Promise<Array<{ count: number; text: string }>> {
  if (saves.length === 0) return [];

  const byType: Record<string, string[]> = {};
  for (const s of saves) (byType[s.entity_type] ??= []).push(s.entity_id);

  const [crafterCities, storeCities, studioCities, eventCities] = await Promise.all([
    cityLabelsFor("crafter", byType.CRAFTER ?? []),
    cityLabelsFor("store", byType.STORE ?? []),
    cityLabelsFor("studio", byType.STUDIO ?? []),
    cityLabelsFor("event", byType.EVENT ?? []),
  ]);

  const counts: Record<string, number> = {};
  function add(ids: string[], labels: LabelMap, noun: string) {
    for (const id of ids) {
      const c = labels.get(id);
      if (!c) continue;
      const key = `${noun} in ${c}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  add(byType.CRAFTER ?? [], crafterCities, "crafters");
  add(byType.STORE ?? [], storeCities, "stores");
  add(byType.STUDIO ?? [], studioCities, "studios");
  add(byType.EVENT ?? [], eventCities, "events");

  return Object.entries(counts)
    .filter(([, n]) => n >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([text, count]) => ({
      text: `${count === 1 ? "person" : "people"} saved ${text} in the last day.`,
      count,
    }));
}
