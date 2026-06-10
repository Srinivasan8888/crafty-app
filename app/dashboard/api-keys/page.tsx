// V3 Tier 3 — API keys management surface for the signed-in user.
// Lists existing keys, lets the user create new ones (one-time secret reveal)
// and revoke them.

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiKeysClient } from "./ApiKeysClient";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const user = await requireUser();
  const keys = await prisma.apiKey.findMany({
    where: { owner_user_id: user.id },
    orderBy: { created_at: "desc" },
    select: {
      id: true, name: true, prefix: true, scopes: true,
      rate_limit_per_min: true, last_used_at: true, revoked_at: true, created_at: true,
    },
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">API keys</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Build against Crafty&apos;s public read API. Each key gives access to
          listings for your widgets or partner integrations.
        </p>
        <p className="mt-2 text-xs text-ink-subtle">
          Base URL: <code className="rounded bg-canvas-sunken px-1 py-0.5">/api/public/v1/*</code> ·
          Send <code className="rounded bg-canvas-sunken px-1 py-0.5">Authorization: Bearer crafty_…</code>
        </p>
      </header>
      <ApiKeysClient initialKeys={keys.map((k) => ({
        ...k,
        last_used_at: k.last_used_at?.toISOString() ?? null,
        revoked_at: k.revoked_at?.toISOString() ?? null,
        created_at: k.created_at.toISOString(),
      }))} />
    </div>
  );
}
