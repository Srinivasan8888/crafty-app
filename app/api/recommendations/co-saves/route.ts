// V3 — "People who saved this also saved" endpoint.
// Public: recs are not personalized for the caller; this surface can be cached
// safely at the edge (s-maxage=900 / SWR 1h).

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { ENTITY_TYPES } from "@/lib/types";
import { getCoSaves } from "@/lib/recommendations";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, "saves");
  if (!rl.allowed) {
    const retry = Math.ceil(rl.resetIn / 1000);
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  const sp = req.nextUrl.searchParams;
  const entityType = sp.get("entity_type");
  const entityId = sp.get("entity_id");
  const limitRaw = sp.get("limit");

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }
  if (!(ENTITY_TYPES as ReadonlyArray<string>).includes(entityType)) {
    return NextResponse.json({ error: "invalid_entity_type" }, { status: 400 });
  }
  if (entityId.length < 1 || entityId.length > 30) {
    return NextResponse.json({ error: "invalid_entity_id" }, { status: 400 });
  }

  let limit = 8;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (Number.isFinite(n) && n >= 1 && n <= 24) limit = Math.floor(n);
  }

  const hits = await getCoSaves(entityType, entityId, limit);
  return NextResponse.json(
    { hits },
    {
      headers: {
        // 15 min fresh, 1h stale-while-revalidate. Recs don't need to be
        // instantaneous, and the underlying co-save graph moves slowly.
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    },
  );
}
