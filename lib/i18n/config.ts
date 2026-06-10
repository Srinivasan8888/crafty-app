// V3 — multi-language support.
//
// Cookie-based locale resolution (NOT URL-segment routing) — chosen to avoid
// churning every existing /[city]/... route. See lib/i18n/request.ts for the
// next-intl wiring.

export const LOCALES = ["en", "hi", "ta", "kn"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "crafty_locale";

// Display names — rendered in the locale switcher dropdown. Pair the native
// name with the English name so the language is recognisable to both
// readers + non-readers of the script.
export const LOCALE_LABELS: Record<Locale, { native: string; english: string }> = {
  en: { native: "English", english: "English" },
  hi: { native: "हिन्दी", english: "Hindi" },
  ta: { native: "தமிழ்", english: "Tamil" },
  kn: { native: "ಕನ್ನಡ", english: "Kannada" },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
