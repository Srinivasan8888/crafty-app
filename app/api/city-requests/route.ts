// V1.5 — buyer-submitted CityRequest. Lightweight: takes a city name + optional
// email + best-effort IP-derived country. Increments `count` if the city has
// been requested before (uniqued by name).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

const Schema = z.object({
  city_name: z.string().min(2).max(80).trim(),
  region: z.string().max(80).trim().nullable().optional(),
  reporter_email: z.string().email().max(200).nullable().optional(),
});

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }
  const rl = await rateLimit(req, "flags"); // share flag bucket; this is an anti-spam vote
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const ip_country = req.headers.get("x-vercel-ip-country")
    ?? req.headers.get("cf-ipcountry")
    ?? null;

  const normalized = data.city_name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

  await prisma.cityRequest.upsert({
    where: { city_name: normalized },
    create: {
      city_name: normalized,
      region: data.region ?? null,
      reporter_email: data.reporter_email ?? null,
      ip_country,
    },
    update: {
      count: { increment: 1 },
      // First-touch wins on email/region — don't overwrite with later requesters.
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
