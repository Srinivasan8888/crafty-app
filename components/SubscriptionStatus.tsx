// V3 — small "Pro" pill next to "Signed in as" in the dashboard sidebar.
// Server-rendered; reads the current user once. Renders nothing if FREE.

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPro } from "@/lib/subscription-gates";
import { Sparkles } from "lucide-react";

export async function SubscriptionStatus() {
  const u = await getCurrentUser();
  if (!u) return null;
  // Hit the User row (rather than the SessionUser) for the latest tier/expires.
  const row = await prisma.user.findUnique({
    where: { id: u.id },
    select: { subscription_tier: true, subscription_expires_at: true },
  });
  if (!row || !isPro(row)) return null;

  return (
    <span
      title="Crafty Pro"
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{
        background: "var(--tint-mustard-mid, rgb(var(--cream-2)))",
        color: "rgb(var(--magenta))",
        border: "1px solid rgb(var(--magenta) / 0.3)",
      }}
    >
      <Sparkles size={10} aria-hidden="true" />
      Pro
    </span>
  );
}
