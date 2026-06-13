// V3 Tier 4 — Analytics warehouse export (SCAFFOLD with useful local artifact).
//
// Recommended schedule: nightly, e.g. `0 19 * * *` (00:30 IST).
//
// Each table dumps to `var/warehouse/<YYYY-MM-DD>/<table>.jsonl`. One file
// per table per day. We strip the most-sensitive fields before writing so a
// future "upload to BigQuery" step is safe to ship as-is:
//   - User.email_bounced (Resend internals)
//   - Order.razorpay_payment_id (PII / chargeback target)
//
// V3.1 constraint: each table is capped at 100K rows per run so the export
// stays within Node's working memory. If the row counts grow past that, we
// either bump per-page batching, switch to COPY TO PROGRAM, or chunk by
// created_at into multiple runs.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PAGE_SIZE = 1000;
const TABLE_CAP = 100_000;

type DumpResult = { name: string; rows: number; path: string };

async function dumpTable<T extends { id: string }>(
  name: string,
  outDir: string,
  fetchPage: (cursor: string | null) => Promise<T[]>,
  redact?: (row: T) => Record<string, unknown>,
): Promise<DumpResult> {
  const filePath = path.join(outDir, `${name}.jsonl`);
  const stream = createWriteStream(filePath, { flags: "w" });
  let cursor: string | null = null;
  let total = 0;

  try {
    while (total < TABLE_CAP) {
      const page = await fetchPage(cursor);
      if (page.length === 0) break;
      for (const row of page) {
        const clean = redact ? redact(row) : (row as Record<string, unknown>);
        stream.write(JSON.stringify(clean) + "\n");
        total++;
        if (total >= TABLE_CAP) break;
      }
      cursor = page[page.length - 1].id;
      if (page.length < PAGE_SIZE) break;
    }
  } finally {
    await new Promise<void>((resolve) => stream.end(resolve));
  }

  return { name, rows: total, path: filePath };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.nextUrl.searchParams.get("token");
  if (!secret || secret === "placeholder") {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const isoDate = new Date().toISOString().slice(0, 10);
  const outDir = path.join(process.cwd(), "var", "warehouse", isoDate);
  if (!existsSync(outDir)) {
    await mkdir(outDir, { recursive: true });
  }

  const tables: DumpResult[] = [];

  // User — strip the bounce flag (internal Resend state).
  tables.push(
    await dumpTable(
      "User",
      outDir,
      (cursor) =>
        prisma.user.findMany({
          take: PAGE_SIZE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { id: "asc" },
        }),
      (u) => {
        const { email_bounced: _omit, ...rest } = u as unknown as Record<string, unknown>;
        void _omit;
        return rest;
      },
    ),
  );

  tables.push(
    await dumpTable("Crafter", outDir, (cursor) =>
      prisma.crafter.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      }),
    ),
  );

  tables.push(
    await dumpTable("Store", outDir, (cursor) =>
      prisma.store.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      }),
    ),
  );

  tables.push(
    await dumpTable("Studio", outDir, (cursor) =>
      prisma.studio.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      }),
    ),
  );

  tables.push(
    await dumpTable("Event", outDir, (cursor) =>
      prisma.event.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      }),
    ),
  );

  tables.push(
    await dumpTable("Save", outDir, (cursor) =>
      prisma.save.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      }),
    ),
  );

  tables.push(
    await dumpTable("Flag", outDir, (cursor) =>
      prisma.flag.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      }),
    ),
  );

  // Order — strip razorpay_payment_id (PII / chargeback target).
  // razorpay_order_id is kept since it's the warehouse's join key to
  // payment-system events.
  tables.push(
    await dumpTable(
      "Order",
      outDir,
      (cursor) =>
        prisma.order.findMany({
          take: PAGE_SIZE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { id: "asc" },
        }),
      (o) => {
        const { razorpay_payment_id: _omit, ...rest } = o as unknown as Record<string, unknown>;
        void _omit;
        return rest;
      },
    ),
  );

  tables.push(
    await dumpTable("OrderItem", outDir, (cursor) =>
      prisma.orderItem.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      }),
    ),
  );

  tables.push(
    await dumpTable("Review", outDir, (cursor) =>
      prisma.review.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      }),
    ),
  );

  tables.push(
    await dumpTable("Conversation", outDir, (cursor) =>
      prisma.conversation.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      }),
    ),
  );

  tables.push(
    await dumpTable("Message", outDir, (cursor) =>
      prisma.message.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      }),
    ),
  );

  tables.push(
    await dumpTable("SavedSearch", outDir, (cursor) =>
      prisma.savedSearch.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      }),
    ),
  );

  tables.push(
    await dumpTable("Payout", outDir, (cursor) =>
      prisma.payout.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      }),
    ),
  );

  tables.push(
    await dumpTable("Subscription", outDir, (cursor) =>
      prisma.subscription.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      }),
    ),
  );

  // FeatureOrder — strip razorpay_payment_id like Order.
  tables.push(
    await dumpTable(
      "FeatureOrder",
      outDir,
      (cursor) =>
        prisma.featureOrder.findMany({
          take: PAGE_SIZE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { id: "asc" },
        }),
      (o) => {
        const { razorpay_payment_id: _omit, ...rest } = o as unknown as Record<string, unknown>;
        void _omit;
        return rest;
      },
    ),
  );

  tables.push(
    await dumpTable("AuditLog", outDir, (cursor) =>
      prisma.auditLog.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      }),
    ),
  );

  await prisma.cronRun.create({ data: { job_name: "warehouse_sync", status: "success", completed_at: new Date(), rows_affected: tables.reduce((a, t) => a + t.rows, 0) } }).catch((e) => console.error("[cron] record", e));
  return NextResponse.json({
    ok: true,
    path: outDir,
    tables: tables.map((t) => ({ name: t.name, rows: t.rows })),
    at: new Date(),
  });

  // TODO (V3.1) — upload to BigQuery / S3:
  //   1. `gcloud auth activate-service-account --key-file=...`
  //   2. For each *.jsonl: `bq load --source_format=NEWLINE_DELIMITED_JSON
  //        crafty_warehouse.<table> <path>.jsonl <schema-json>`
  //   3. Or S3: `aws s3 cp --recursive var/warehouse/<date> s3://crafty-warehouse/<date>/`
  //   4. Then trigger downstream dbt models / Looker refresh.
  //   5. Garbage-collect var/warehouse/ entries older than 14 days.
}
