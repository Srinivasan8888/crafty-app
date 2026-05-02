import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { processAndStoreImage, type Folder } from "@/lib/image";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

const ALLOWED_FOLDERS: Folder[] = ["profile-photos", "portfolio", "event-covers"];
const MAX_UPLOAD_BYTES = 6_000_000; // 6 MB hard ceiling at the edge.

export const runtime = "nodejs";        // sharp needs Node, not edge
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // S5 — CSRF defense in depth.
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  // Rate limit first — uploads are the most expensive endpoint.
  const rl = rateLimit(req, "upload");
  if (!rl.allowed) {
    const retry = Math.ceil(rl.resetIn / 1000);
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  // Reject oversize bodies BEFORE buffering the form — saves memory + sharp work.
  const len = parseInt(req.headers.get("content-length") ?? "0", 10);
  if (len > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  }

  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const folder = (url.searchParams.get("folder") ?? "profile-photos") as Folder;
  if (!ALLOWED_FOLDERS.includes(folder)) {
    return NextResponse.json({ error: "invalid_folder" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const variants = await processAndStoreImage(buf, file.type, folder);
    return NextResponse.json(variants, { status: 200 });
  } catch (e: any) {
    const code = e?.message === "UNSUPPORTED_MIME" ? 415
              : e?.message === "FILE_TOO_LARGE"   ? 413 : 500;
    return NextResponse.json({ error: e?.message ?? "upload_failed" }, { status: code });
  }
}
