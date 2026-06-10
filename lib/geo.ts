// V1.5 — best-effort request geolocation.
//
// Uses standard host-header signals that hosting providers inject:
//   - Vercel: x-vercel-ip-country, x-vercel-ip-city
//   - Cloudflare: cf-ipcountry, cf-ipcity
//   - Replit / generic: none, returns null
//
// Don't use this for anything security-sensitive — it's just a hint to
// auto-pick the city selector or show the unsupported-city banner.

import { headers } from "next/headers";

const SUPPORTED_CITY_HINTS: Record<string, string> = {
  // Loose match — substring on the city header.
  bengaluru: "bengaluru",
  bangalore: "bengaluru",
  mumbai: "mumbai",
  bombay: "mumbai",
  delhi: "delhi",
  "new delhi": "delhi",
  hyderabad: "hyderabad",
  chennai: "chennai",
  madras: "chennai",
  pune: "pune",
};

export type GeoHint = {
  country: string | null;     // ISO 2-letter, uppercase
  city: string | null;        // raw header value
  matchedCitySlug: string | null;
  isLikelyIN: boolean;
};

export function readGeoHint(): GeoHint {
  const h = headers();
  const country = (h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? "").toUpperCase() || null;
  const cityRaw = h.get("x-vercel-ip-city") ?? h.get("cf-ipcity") ?? null;
  const cityLower = cityRaw?.toLowerCase().trim() ?? null;
  let matchedCitySlug: string | null = null;
  if (cityLower) {
    for (const [hint, slug] of Object.entries(SUPPORTED_CITY_HINTS)) {
      if (cityLower.includes(hint)) {
        matchedCitySlug = slug;
        break;
      }
    }
  }
  return {
    country,
    city: cityRaw,
    matchedCitySlug,
    isLikelyIN: country === "IN" || country === null, // null treated as "could be India"
  };
}
