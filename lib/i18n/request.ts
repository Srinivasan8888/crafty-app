// V3 — next-intl request config.
//
// Cookie-based locale lookup: read `crafty_locale` and fall back to default.
// We deliberately don't use middleware-level routing — that would require
// rewriting every /[city]/... route and complicate the Descope-aware
// middleware. Cookie+server-action keeps the surface area small.

import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";

export function readLocaleCookie(): Locale {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = readLocaleCookie();
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return {
    locale,
    messages,
  };
});
