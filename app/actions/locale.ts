"use server";

// V3 — locale-cookie writer. The LocaleSwitcher invokes this server action,
// then refreshes the page so Server Components re-render with the new locale.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

export async function setLocale(value: string) {
  if (!isLocale(value)) return;
  cookies().set(LOCALE_COOKIE, value, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
    sameSite: "lax",
    httpOnly: false, // readable client-side for hydration debug; not sensitive
  });
  revalidatePath("/", "layout");
}
