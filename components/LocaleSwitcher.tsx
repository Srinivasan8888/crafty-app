"use client";

// V3 — locale switcher.
//
// Native <select> in disguise: lightest possible client surface, accessible
// for free, works under the existing CSP. Submits to a server action which
// writes the cookie + revalidates the layout.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { setLocale } from "@/app/actions/locale";

export function LocaleSwitcher({ current }: { current: Locale }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <label
      className="hidden md:inline-flex items-center gap-1.5"
      style={{
        background: "rgb(var(--cream-2))",
        border: "1px solid var(--line-strong)",
        borderRadius: "var(--r-pill)",
        padding: "6px 10px",
        fontSize: 13,
        cursor: "pointer",
      }}
      aria-label="Change language"
    >
      <Languages size={14} aria-hidden="true" />
      <select
        defaultValue={current}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value as Locale;
          startTransition(async () => {
            await setLocale(next);
            router.refresh();
          });
        }}
        style={{
          background: "transparent",
          border: 0,
          outline: 0,
          font: "inherit",
          color: "inherit",
          cursor: "pointer",
          paddingRight: 4,
        }}
      >
        {LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_LABELS[loc].native}
          </option>
        ))}
      </select>
    </label>
  );
}
