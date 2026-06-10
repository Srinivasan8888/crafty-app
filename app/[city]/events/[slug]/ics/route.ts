// V3 Tier 3 — minimal RFC 5545 iCalendar feed for a single event or series.
//
// GET /<city>/events/<slug>/ics  →  text/calendar (.ics) file.
// If the URL hits a series master OR an occurrence, we include all future
// occurrences of the series in a single VCALENDAR.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function pad(n: number, w = 2): string {
  return String(n).padStart(w, "0");
}

function formatICalDate(d: Date): string {
  // YYYYMMDDTHHMMSSZ
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeICal(s: string): string {
  // RFC 5545 §3.3.11 — escape backslash, comma, semicolon. Newlines → \n.
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldLine(line: string): string {
  // RFC 5545 §3.1 line folding at 75 octets. Simple char-based fold is fine
  // for our ASCII-heavy content; if we ever need full UTF-8 octet folding,
  // we can swap to a Buffer-based pass.
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    out.push((i === 0 ? "" : " ") + line.slice(i, i + 74));
    i += 74;
  }
  return out.join("\r\n");
}

function buildVEvent(opts: {
  uid: string;
  dtstart: Date;
  dtend: Date;
  summary: string;
  description: string;
  location: string;
  url: string;
  now: Date;
}): string {
  return [
    "BEGIN:VEVENT",
    foldLine(`UID:${opts.uid}`),
    foldLine(`DTSTAMP:${formatICalDate(opts.now)}`),
    foldLine(`DTSTART:${formatICalDate(opts.dtstart)}`),
    foldLine(`DTEND:${formatICalDate(opts.dtend)}`),
    foldLine(`SUMMARY:${escapeICal(opts.summary)}`),
    foldLine(`DESCRIPTION:${escapeICal(opts.description)}`),
    foldLine(`LOCATION:${escapeICal(opts.location)}`),
    foldLine(`URL:${opts.url}`),
    "END:VEVENT",
  ].join("\r\n");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { city: string; slug: string } },
) {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    select: {
      id: true, slug: true, name: true, description: true,
      start_at: true, end_at: true, venue_name: true, venue_address: true,
      status: true, recurrence_master_id: true,
      city: { select: { slug: true, display_name: true } },
    },
  });
  if (!event || event.status !== "PUBLISHED" || event.city.slug !== params.city) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Crafty//Crafty Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  // Determine if this event is part of a series.
  // If it's an occurrence, climb to the master so we emit all siblings.
  // If it's the master, fetch its children.
  const masterId = event.recurrence_master_id ?? event.id;
  const siblings = event.recurrence_master_id
    ? await prisma.event.findMany({
        where: {
          OR: [{ id: masterId }, { recurrence_master_id: masterId }],
          status: "PUBLISHED",
          end_at: { gte: now },
        },
        orderBy: { start_at: "asc" },
        select: {
          id: true, slug: true, name: true, description: true,
          start_at: true, end_at: true, venue_name: true, venue_address: true,
          city: { select: { slug: true, display_name: true } },
        },
      })
    : await prisma.event.findMany({
        where: {
          OR: [{ id: event.id }, { recurrence_master_id: event.id }],
          status: "PUBLISHED",
          end_at: { gte: now },
        },
        orderBy: { start_at: "asc" },
        select: {
          id: true, slug: true, name: true, description: true,
          start_at: true, end_at: true, venue_name: true, venue_address: true,
          city: { select: { slug: true, display_name: true } },
        },
      });

  // If for some reason no future siblings (e.g. master + occurrences all past),
  // still emit at least the requested event so the file isn't empty.
  const toEmit = siblings.length > 0 ? siblings : [event];

  for (const e of toEmit) {
    const location = e.venue_address
      ? `${e.venue_name}, ${e.venue_address}, ${e.city.display_name}`
      : `${e.venue_name}, ${e.city.display_name}`;
    lines.push(
      buildVEvent({
        uid: `${e.id}@crafty.app`,
        dtstart: e.start_at,
        dtend: e.end_at,
        summary: e.name,
        description: e.description,
        location,
        url: `${SITE_URL}/${e.city.slug}/events/${e.slug}`,
        now,
      }),
    );
  }

  lines.push("END:VCALENDAR");
  const body = lines.join("\r\n") + "\r\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
