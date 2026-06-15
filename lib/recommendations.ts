// Co-save recommendations — plain SQL on the Save table, no ML.
//
// Algorithm (item-to-item collaborative filtering, single-hop):
//   Given an entity E of type T:
//     1. Find all users who saved E.
//     2. Find every OTHER entity those users also saved, restricted to the
//        same entity_type (a buyer who saved one crafter wants more crafters,
//        not unrelated event picks).
//     3. Group by other entity, count co-save occurrences. That count is the score.
//     4. Materialize the still-PUBLISHED entities and return them in score order.
//   For "for you" we extend one hop: the user's own shelf becomes the seed set
//   (each save weights equally), and we exclude the user's own saves from the
//   result so the surface is genuinely new.

import { prisma } from "./db";

export type RecEntityType = "CRAFTER" | "STORE" | "STUDIO" | "EVENT";

export type RecHit = {
  entity_type: RecEntityType;
  entity_id: string;
  score: number;
  name: string;
  slug: string;
  city_slug: string;
  image_url?: string;
  blurhash?: string;
};

type CountRow = { entity_id: string; score: bigint };

const ENTITY_TYPES: ReadonlyArray<RecEntityType> = ["CRAFTER", "STORE", "STUDIO", "EVENT"];

function isRecEntityType(s: string): s is RecEntityType {
  return (ENTITY_TYPES as ReadonlyArray<string>).includes(s);
}

/**
 * "People who saved this also saved" — co-save recommendations for a single
 * entity. Returns up to `limit` PUBLISHED entities of the same type, ordered
 * by co-save count descending.
 */
export async function getCoSaves(
  entityType: string,
  entityId: string,
  limit = 8,
): Promise<RecHit[]> {
  if (!isRecEntityType(entityType)) return [];
  const cap = Math.min(Math.max(limit, 1), 24);

  // Co-occurrence count via raw SQL. The cast to ::text keeps the enum
  // comparison portable; Prisma sends SavedEntityType as a Postgres enum
  // value already, but ::text avoids surprises across schema changes.
  // The inner subquery is the set of users who saved (entityType, entityId);
  // the outer join finds OTHER entities they also saved.
  const rows = await prisma.$queryRaw<CountRow[]>`
    SELECT s2.entity_id AS entity_id, COUNT(*)::bigint AS score
    FROM "Save" s2
    WHERE s2.entity_type::text = ${entityType}
      AND s2.entity_id <> ${entityId}
      AND s2.user_id IN (
        SELECT s1.user_id FROM "Save" s1
        WHERE s1.entity_type::text = ${entityType}
          AND s1.entity_id = ${entityId}
      )
    GROUP BY s2.entity_id
    ORDER BY COUNT(*) DESC, MAX(s2.created_at) DESC
    LIMIT ${cap}
  `;

  if (rows.length === 0) return [];

  return hydrate(entityType, rows);
}

/**
 * "For you" — personalized recs based on the user's full save shelf.
 * Excludes the user's own saves. Returns mixed-type hits, up to `limit`.
 *
 * `opts.cityId` (optional) scopes the materialized results to a single city —
 * used by the city landing's "Picks for you in {City}" rail so the surface
 * stays city-scoped (no global feed). PUBLISHED + non-expired filtering still
 * applies. The co-save graph itself is computed globally (saves anywhere can
 * inform the score); only hydration is filtered to the city.
 */
export async function getForYou(
  userId: string,
  limit = 12,
  opts?: { cityId?: string },
): Promise<RecHit[]> {
  const cap = Math.min(Math.max(limit, 1), 36);
  const cityId = opts?.cityId;

  // We fan out per entity_type so we can hydrate cheaply (one query per type
  // rather than four conditional joins). Each per-type query mirrors getCoSaves
  // but seeds from the user's entire shelf of that type.
  const perType = await Promise.all(
    ENTITY_TYPES.map(async (t) => {
      const rows = await prisma.$queryRaw<CountRow[]>`
        SELECT s2.entity_id AS entity_id, COUNT(*)::bigint AS score
        FROM "Save" s2
        WHERE s2.entity_type::text = ${t}
          AND s2.user_id <> ${userId}
          AND s2.user_id IN (
            SELECT s1.user_id FROM "Save" s1
            WHERE s1.entity_type::text = ${t}
              AND s1.user_id <> ${userId}
              AND s1.entity_id IN (
                SELECT s0.entity_id FROM "Save" s0
                WHERE s0.user_id = ${userId}
                  AND s0.entity_type::text = ${t}
              )
          )
          AND s2.entity_id NOT IN (
            SELECT s3.entity_id FROM "Save" s3
            WHERE s3.user_id = ${userId}
              AND s3.entity_type::text = ${t}
          )
        GROUP BY s2.entity_id
        ORDER BY COUNT(*) DESC, MAX(s2.created_at) DESC
        LIMIT ${cap}
      `;
      return { type: t, rows };
    }),
  );

  // Hydrate each bucket in parallel, then merge by global score.
  const hydrated = await Promise.all(
    perType.map(({ type, rows }) => (rows.length === 0 ? Promise.resolve([] as RecHit[]) : hydrate(type, rows, cityId))),
  );

  const merged = hydrated.flat();
  merged.sort((a, b) => b.score - a.score);
  return merged.slice(0, cap);
}

// ─── Hydration ───────────────────────────────────────────────────────
// Convert a list of (entity_id, score) for a single entity_type into a list
// of RecHit by issuing exactly ONE findMany per type — no N+1. Filters out
// entities that are no longer PUBLISHED (deleted_at IS NULL, status = PUBLISHED).

async function hydrate(entityType: string, rows: CountRow[], cityId?: string): Promise<RecHit[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.entity_id);
  const scoreById = new Map<string, number>();
  for (const r of rows) scoreById.set(r.entity_id, Number(r.score));
  // When city-scoped, narrow each materialization to the city (keeps the
  // landing rail city-scoped — no global feed). Spread into the existing
  // where so PUBLISHED / non-expired filters are preserved.
  const cityWhere = cityId ? { city_id: cityId } : {};

  switch (entityType) {
    case "CRAFTER": {
      const records = await prisma.crafter.findMany({
        where: { id: { in: ids }, status: "PUBLISHED", ...cityWhere },
        select: {
          id: true,
          slug: true,
          name: true,
          profile_photo: true,
          profile_photo_blurhash: true,
          city: { select: { slug: true } },
        },
      });
      return records
        .map((r) => ({
          entity_type: "CRAFTER" as const,
          entity_id: r.id,
          score: scoreById.get(r.id) ?? 0,
          name: r.name,
          slug: r.slug,
          city_slug: r.city.slug,
          image_url: r.profile_photo,
          blurhash: r.profile_photo_blurhash ?? undefined,
        }))
        .sort((a, b) => b.score - a.score);
    }
    case "STORE": {
      const records = await prisma.store.findMany({
        where: { id: { in: ids }, status: "PUBLISHED", ...cityWhere },
        select: {
          id: true,
          slug: true,
          name: true,
          logo_photo: true,
          logo_photo_blurhash: true,
          city: { select: { slug: true } },
        },
      });
      return records
        .map((r) => ({
          entity_type: "STORE" as const,
          entity_id: r.id,
          score: scoreById.get(r.id) ?? 0,
          name: r.name,
          slug: r.slug,
          city_slug: r.city.slug,
          image_url: r.logo_photo,
          blurhash: r.logo_photo_blurhash ?? undefined,
        }))
        .sort((a, b) => b.score - a.score);
    }
    case "STUDIO": {
      const records = await prisma.studio.findMany({
        where: { id: { in: ids }, status: "PUBLISHED", ...cityWhere },
        select: {
          id: true,
          slug: true,
          name: true,
          logo_photo: true,
          logo_photo_blurhash: true,
          city: { select: { slug: true } },
        },
      });
      return records
        .map((r) => ({
          entity_type: "STUDIO" as const,
          entity_id: r.id,
          score: scoreById.get(r.id) ?? 0,
          name: r.name,
          slug: r.slug,
          city_slug: r.city.slug,
          image_url: r.logo_photo,
          blurhash: r.logo_photo_blurhash ?? undefined,
        }))
        .sort((a, b) => b.score - a.score);
    }
    case "EVENT": {
      // Events also filter out anything already past (end_at < now) — a recommended
      // event in the past is just clutter.
      const records = await prisma.event.findMany({
        where: {
          id: { in: ids },
          status: "PUBLISHED",
          end_at: { gte: new Date() },
          ...cityWhere,
        },
        select: {
          id: true,
          slug: true,
          name: true,
          cover_image: true,
          cover_image_blurhash: true,
          city: { select: { slug: true } },
        },
      });
      return records
        .map((r) => ({
          entity_type: "EVENT" as const,
          entity_id: r.id,
          score: scoreById.get(r.id) ?? 0,
          name: r.name,
          slug: r.slug,
          city_slug: r.city.slug,
          image_url: r.cover_image,
          blurhash: r.cover_image_blurhash ?? undefined,
        }))
        .sort((a, b) => b.score - a.score);
    }
    default:
      return [];
  }
}

/**
 * Map an entity_type to its public URL segment under /[city]/...
 * Centralized here so the recommendation surfaces (cards, emails) agree.
 */
export function urlSegmentFor(entityType: RecEntityType): "crafters" | "stores" | "learn" | "events" {
  switch (entityType) {
    case "CRAFTER": return "crafters";
    case "STORE": return "stores";
    case "STUDIO": return "learn";
    case "EVENT": return "events";
  }
}

export function publicHrefFor(hit: RecHit): string {
  return `/${hit.city_slug}/${urlSegmentFor(hit.entity_type)}/${hit.slug}`;
}
