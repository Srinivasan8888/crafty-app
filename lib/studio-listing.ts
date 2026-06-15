// Query builder for the Learn (studios) listing. Extracted from the page so
// the filter/sort behavior is unit-testable without a DB — each control here
// maps to a real Studio column (feature-bug-audit 3.x).

import type { Prisma } from "@prisma/client";

export type StudioSort = "featured" | "newest";

export function normalizeStudioSort(raw: string | undefined): StudioSort {
  return raw === "newest" ? "newest" : "featured";
}

export function buildStudioListingQuery(opts: {
  cityId: string;
  discipline?: string;
  online?: boolean;
  sort: StudioSort;
}): {
  where: Prisma.StudioWhereInput;
  orderBy: Prisma.StudioOrderByWithRelationInput[];
} {
  const where: Prisma.StudioWhereInput = {
    city_id: opts.cityId,
    status: "PUBLISHED",
    ...(opts.discipline
      ? { craft_disciplines: { some: { discipline: { slug: opts.discipline } } } }
      : {}),
    ...(opts.online ? { is_online_only: true } : {}),
  };
  // "Featured first" (default) floats paid/featured studios up; "Newest" sorts
  // purely by recency.
  const orderBy =
    opts.sort === "newest"
      ? [{ created_at: "desc" as const }]
      : [{ is_featured: "desc" as const }, { created_at: "desc" as const }];
  return { where, orderBy };
}
