// DEV-ONLY endpoint for the DesignCommentOverlay. Appends each visual comment
// to .design-comments.jsonl at the repo root so Claude can read them and make
// edits. Hard-disabled in production so it can never ship as a write endpoint.
import { NextResponse } from "next/server";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const FILE = path.join(process.cwd(), ".design-comments.jsonl");
const ENABLED = process.env.NODE_ENV !== "production";

export async function POST(req: Request) {
  if (!ENABLED) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  await appendFile(FILE, JSON.stringify(body) + "\n", "utf8");
  return NextResponse.json({ ok: true });
}

export async function GET() {
  if (!ENABLED) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const raw = await readFile(FILE, "utf8").catch(() => "");
  const items = raw
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return NextResponse.json({ items });
}

// Clear the queue once comments are applied.
export async function DELETE() {
  if (!ENABLED) return NextResponse.json({ error: "disabled" }, { status: 404 });
  await writeFile(FILE, "", "utf8");
  return NextResponse.json({ ok: true });
}
