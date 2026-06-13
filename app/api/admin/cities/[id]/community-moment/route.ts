// V1.5 — set or clear City.community_moment (JSON).

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";
import { uploadedImageUrl } from "@/lib/upload-url";

export const runtime = "nodejs";

const Schema = z.union([
  z.object({ clear: z.literal(true) }),
  z.object({
    photoUrl: uploadedImageUrl,
    caption: z.string().min(1).max(140),
  }),
]);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  try { await requireAdmin(); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });

  const city = await prisma.city.findUnique({ where: { id: params.id }, select: { slug: true } });
  if (!city) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data = parsed.data;
  await prisma.city.update({
    where: { id: params.id },
    data: {
      community_moment:
        "clear" in data
          ? Prisma.DbNull
          : { photoUrl: data.photoUrl, caption: data.caption },
    },
  });

  revalidatePath(`/${city.slug}`);
  revalidatePath("/admin/cities");
  return NextResponse.json({ ok: true });
}
