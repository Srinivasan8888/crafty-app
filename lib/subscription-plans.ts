// V3 — Crafty Pro plan configuration.
//
// Two billing cadences. Prices are whole-rupees (INR); paise conversion only
// happens at the Razorpay API boundary (see lib/razorpay.ts).
//
// Razorpay requires plans to be pre-created in their dashboard (Subscriptions
// → Plans). The `plan_id_env_var` field below is the env var name where the
// Razorpay-side plan_id lives. A future `scripts/razorpay-setup.ts` (mirroring
// the descope-setup pattern) could auto-create those plans via Razorpay's
// `/v1/plans` API and write the IDs back here — out of scope for V3 MVP.

export type PlanKey = "monthly" | "annual";

type PlanConfig = {
  amount_inr: number;            // whole rupees
  interval: "monthly" | "yearly";
  plan_id_env_var: string;       // env var holding the Razorpay plan_id
  display_label: string;
  display_price: string;
  display_period: string;
};

const PLANS: Record<PlanKey, PlanConfig> = {
  monthly: {
    amount_inr: 299,
    interval: "monthly",
    plan_id_env_var: "RAZORPAY_PLAN_MONTHLY",
    display_label: "Monthly",
    display_price: "₹299",
    display_period: "per month",
  },
  annual: {
    amount_inr: 2999,
    interval: "yearly",
    plan_id_env_var: "RAZORPAY_PLAN_ANNUAL",
    display_label: "Annual",
    display_price: "₹2,999",
    display_period: "per year",
  },
};

export function getPlanConfig(plan: PlanKey): PlanConfig {
  return PLANS[plan];
}

export function getRazorpayPlanId(plan: PlanKey): string | null {
  const cfg = PLANS[plan];
  const v = process.env[cfg.plan_id_env_var];
  if (!v || v === "plan_placeholder") return null;
  return v;
}

export function allPlans(): Array<{ key: PlanKey } & PlanConfig> {
  return (Object.keys(PLANS) as PlanKey[]).map((k) => ({ key: k, ...PLANS[k] }));
}
