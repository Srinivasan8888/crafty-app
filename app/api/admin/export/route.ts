// PRD §24.4 — admin CSV export. Streams one of 6 buckets as text/csv.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

type Bucket = "users" | "crafters" | "stores" | "studios" | "events" | "flags";

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  // RFC 4180: quote if contains comma, quote, or newline.
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvCell(r[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  try { await requireAdmin(); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  const bucket = (req.nextUrl.searchParams.get("bucket") ?? "") as Bucket;
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  let rows: Array<Record<string, unknown>> = [];
  switch (bucket) {
    case "users":
      rows = await prisma.user.findMany({
        select: { id: true, email: true, display_name: true, role: true, is_admin: true, is_banned: true, created_at: true },
      });
      break;
    case "crafters":
      rows = (await prisma.crafter.findMany({
        select: { id: true, slug: true, name: true, owner_user_id: true, city: { select: { slug: true } }, status: true, is_featured: true, is_claimed: true, created_at: true },
      })).map((r) => ({ ...r, city: r.city.slug }));
      break;
    case "stores":
      rows = (await prisma.store.findMany({
        select: { id: true, slug: true, name: true, owner_user_id: true, city: { select: { slug: true } }, address: true, is_online_only: true, status: true, is_featured: true, is_claimed: true, created_at: true },
      })).map((r) => ({ ...r, city: r.city.slug }));
      break;
    case "studios":
      rows = (await prisma.studio.findMany({
        select: { id: true, slug: true, name: true, owner_user_id: true, city: { select: { slug: true } }, address: true, status: true, is_featured: true, is_claimed: true, created_at: true },
      })).map((r) => ({ ...r, city: r.city.slug }));
      break;
    case "events":
      rows = (await prisma.event.findMany({
        select: { id: true, slug: true, name: true, organizer_user_id: true, city: { select: { slug: true } }, start_at: true, end_at: true, event_type: true, is_free: true, status: true, created_at: true },
      })).map((r) => ({ ...r, city: r.city.slug }));
      break;
    case "flags":
      rows = await prisma.flag.findMany({
        select: { id: true, entity_type: true, entity_id: true, reason: true, note: true, status: true, created_at: true },
      });
      break;
    default:
      return NextResponse.json({ error: "invalid_bucket" }, { status: 400 });
  }

  const body = toCsv(rows);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="crafty_${bucket}_${stamp}.csv"`,
    },
  });
}
