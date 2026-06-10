import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string, maxLength = 60): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    // Strip combining diacritical marks (U+0300..U+036F) using readable
    // Unicode escapes instead of literal combining characters in source.
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

const RESERVED = new Set([
  // Auth + nav
  "admin","api","app","auth","login","logout","signup","sign-in","sign-up",
  // App routes
  "dashboard","settings","crafters","stores","learn","events","search",
  "list-your-profile","contact","terms","privacy",
  // Static / framework
  "static","_next","public","uploads","manifest","favicon",
  // Auth provider integrations
  "descope","clerk","auth","webhooks",
  // Error pages
  "404","500","403","robots","sitemap",
  // Reserved for future product surfaces
  "about","help","support","blog","press","careers","legal",
]);

// Issue: TODO §6.2 — slug collision strategy with reserved-words list.
// Final slug is always ≤60 chars. We slice the BASE to 56 chars so that any
// collision suffix (e.g. "-999") still fits within the 60-char ceiling.
export async function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  // Reserve 4 chars for "-NNN" suffix on collisions.
  const SUFFIX_BUDGET = 4;
  const BASE_MAX = 60 - SUFFIX_BUDGET; // 56
  const sluggedBase = slugify(base, BASE_MAX) || "untitled";

  let candidate = sluggedBase;
  if (RESERVED.has(candidate)) candidate = `${sluggedBase}-1`;
  let i = 1;
  while (await exists(candidate)) {
    i += 1;
    candidate = `${sluggedBase}-${i}`;
  }
  return candidate;
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(d: Date): string {
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
