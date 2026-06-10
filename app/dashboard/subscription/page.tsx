// V3 — Crafty Pro subscription page. Shows current tier, feature comparison,
// and CTAs: upgrade (FREE) or cancel (PRO).

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPro } from "@/lib/subscription-gates";
import { UpgradeButton } from "@/components/UpgradeButton";
import { CancelSubscriptionButton } from "./_components/CancelSubscriptionButton";
import { Check, X, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

type Row = { label: string; free: string | boolean; pro: string | boolean };

const ROWS: Row[] = [
  { label: "Portfolio photos",        free: "6",      pro: "12" },
  { label: "Products on sale",        free: "5",      pro: "25" },
  { label: "Priority placement",      free: false,    pro: true },
  { label: "Pro badge on profile",    free: false,    pro: true },
  { label: "Analytics dashboard",     free: "Basic",  pro: "Full (V3.1)" },
  { label: "Cancel anytime",          free: "—",      pro: true },
];

function cellValue(v: string | boolean) {
  if (v === true) return <Check size={14} className="inline" aria-label="Yes" />;
  if (v === false) return <X size={14} className="inline opacity-50" aria-label="No" />;
  return <span>{v}</span>;
}

export default async function SubscriptionPage() {
  const u = await requireUser();
  const row = await prisma.user.findUnique({
    where: { id: u.id },
    select: { subscription_tier: true, subscription_expires_at: true },
  });
  const sub = await prisma.subscription.findUnique({ where: { user_id: u.id } });
  const pro = isPro(row);

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Crafty Pro</h1>
        <p className="mt-1 text-sm text-muted">
          {pro
            ? "You're on Crafty Pro — thank you for supporting the platform."
            : "Upgrade for more photos, more products, and priority placement."}
        </p>
      </header>

      <section className="card p-5">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-subtle">Current plan</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-display text-lg font-bold text-ink">
                {pro ? "Crafty Pro" : "Free"}
              </span>
              {pro && (
                <span
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
              )}
            </div>
            {pro && sub?.current_period_end && (
              <div className="mt-1 text-xs text-muted">
                {sub.status === "CANCELLED"
                  ? "Cancels on "
                  : "Renews on "}
                {new Date(sub.current_period_end).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {sub.plan && (
                  <>
                    {" · "}
                    {sub.plan === "annual" ? "Annual" : "Monthly"} · ₹{sub.amount_inr.toLocaleString("en-IN")}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--line)" }}>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-ink">Feature</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold text-muted">Free</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold text-accent">Pro</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr
                key={r.label}
                className={i % 2 ? "" : ""}
                style={{
                  borderTop: i === 0 ? "none" : "1px solid var(--line)",
                  background: i % 2 ? "rgb(var(--cream))" : "transparent",
                }}
              >
                <td className="px-4 py-3 text-ink">{r.label}</td>
                <td className="px-4 py-3 text-right text-muted">{cellValue(r.free)}</td>
                <td className="px-4 py-3 text-right font-semibold text-ink">{cellValue(r.pro)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {!pro ? (
        <UpgradeButton initialPlan="annual" />
      ) : (
        <section className="card p-5">
          <h2 className="font-display text-lg font-bold text-ink">Manage subscription</h2>
          {sub?.status === "CANCELLED" ? (
            <p className="mt-1 text-sm text-muted">
              Your subscription is set to cancel at the end of the current cycle. You'll keep Pro
              access until then.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Cancelling stops auto-renewal. You'll keep Pro access until the end of the current
              billing cycle.
            </p>
          )}
          {sub?.status !== "CANCELLED" && (
            <div className="mt-4">
              <CancelSubscriptionButton />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
