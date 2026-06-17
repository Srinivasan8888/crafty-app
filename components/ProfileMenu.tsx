"use client";

// Desktop account dropdown. Replaces the bare profile icon in AppHeader and
// folds in what used to be separate header chips: Saved, the language switcher,
// plus account links and Log out. Signed-out users get Sign in + language.
//
// This is a disclosure (button toggles a popover of links/buttons), NOT an ARIA
// `menu` — a real menu requires arrow-key roving focus, which a popover of mixed
// links + radios doesn't need. Using disclosure semantics keeps it correct
// without that machinery. Focus returns to the trigger on Escape.
//
// The global header is NOT wrapped in Descope's <AuthProvider> (that only mounts
// on dashboard/admin routes), so we can't call the client logout() hook here.
// Log out is a plain link to /logout, a route handler that clears the session
// cookies server-side and redirects home.

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Heart,
  LayoutDashboard,
  CreditCard,
  LogOut,
  LogIn,
  Languages,
  Check,
} from "lucide-react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { setLocale } from "@/app/actions/locale";

type Props = {
  isAuthed: boolean;
  locale: Locale;
  userName?: string | null;
  userEmail?: string | null;
};

export function ProfileMenu({ isAuthed, locale, userName, userEmail }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click or Escape. Escape also restores focus to the trigger
  // so keyboard users don't lose their place.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function changeLocale(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="max-md:!hidden" style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn"
        aria-expanded={open}
        aria-label="Account menu"
        title="Account"
        onClick={() => setOpen((o) => !o)}
      >
        <User size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className="pm-panel">
          {isAuthed && (userName || userEmail) && (
            <div className="pm-id">
              <div className="pm-name">{userName ?? "Your account"}</div>
              {userEmail && <div className="pm-email">{userEmail}</div>}
            </div>
          )}

          {isAuthed ? (
            <>
              <Link
                href="/dashboard?redirect_url=/dashboard"
                className="pm-item"
                onClick={() => setOpen(false)}
              >
                <LayoutDashboard size={16} aria-hidden="true" />
                Dashboard
              </Link>
              <Link
                href="/dashboard/saved?redirect_url=/dashboard/saved"
                className="pm-item"
                onClick={() => setOpen(false)}
              >
                <Heart size={16} aria-hidden="true" />
                Saved
              </Link>
              <Link
                href="/dashboard/subscription"
                className="pm-item"
                onClick={() => setOpen(false)}
              >
                <CreditCard size={16} aria-hidden="true" />
                Subscription
              </Link>
            </>
          ) : (
            <Link href="/sign-in" className="pm-item" onClick={() => setOpen(false)}>
              <LogIn size={16} aria-hidden="true" />
              Sign in
            </Link>
          )}

          <div className="pm-divider" />
          <div className="pm-section">
            <Languages size={13} aria-hidden="true" />
            Language
          </div>
          {LOCALES.map((loc) => (
            <button
              key={loc}
              type="button"
              aria-current={loc === locale ? "true" : undefined}
              disabled={isPending}
              className="pm-item pm-lang"
              onClick={() => changeLocale(loc)}
            >
              <span>{LOCALE_LABELS[loc].native}</span>
              {loc === locale && <Check size={15} aria-hidden="true" />}
            </button>
          ))}

          {isAuthed && (
            <>
              <div className="pm-divider" />
              <a href="/logout" className="pm-item pm-logout">
                <LogOut size={16} aria-hidden="true" />
                Log out
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
