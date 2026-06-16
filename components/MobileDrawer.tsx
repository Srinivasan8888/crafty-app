"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Compass,
  Heart,
  Home,
  Languages,
  Menu,
  Search,
  Store,
  Sparkles,
  Calendar,
  UserPlus,
  LogIn,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { setLocale } from "@/app/actions/locale";

type Props = {
  cities: { slug: string; display_name: string }[];
  currentCity: string;
  locale: Locale;
  isAuthed?: boolean;
};

export function MobileDrawer({ cities, currentCity, locale, isAuthed = false }: Props) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Focus trap: trap Tab / Shift+Tab inside the drawer while open;
  // restore focus to the previously-focused element on close.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  const close = () => setOpen(false);

  const navItems: Array<{
    href: string;
    label: string;
    icon: React.ReactNode;
  }> = [
    { href: `/${currentCity}`, label: "Home", icon: <Home size={16} aria-hidden="true" /> },
    { href: `/${currentCity}/crafters`, label: "Crafters", icon: <Compass size={16} aria-hidden="true" /> },
    { href: `/${currentCity}/stores`, label: "Stores", icon: <Store size={16} aria-hidden="true" /> },
    { href: `/${currentCity}/learn`, label: "Learn", icon: <Sparkles size={16} aria-hidden="true" /> },
    { href: `/${currentCity}/events`, label: "Events", icon: <Calendar size={16} aria-hidden="true" /> },
    { href: `/${currentCity}/search`, label: "Search", icon: <Search size={16} aria-hidden="true" /> },
    { href: "/dashboard/saved?redirect_url=/dashboard/saved", label: "Saved", icon: <Heart size={16} aria-hidden="true" /> },
    // Sign-in / List-your-profile are signed-out affordances only.
    ...(isAuthed
      ? []
      : [
          { href: "/list-your-profile", label: "List your profile", icon: <UserPlus size={16} aria-hidden="true" /> },
          { href: "/sign-in", label: "Sign in", icon: <LogIn size={16} aria-hidden="true" /> },
        ]),
  ];

  return (
    <>
      <button
        type="button"
        className="icon-btn justify-self-start"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div
            className="drawer-backdrop"
            onClick={close}
            aria-hidden="true"
          />
          <aside
            ref={dialogRef}
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <div className="flex items-start justify-between">
              <div className="me">
                <div>
                  <div className="text-xs text-muted">
                    Welcome to
                  </div>
                  <Logo size="sm" />
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close navigation menu"
                onClick={close}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div
              className="font-display text-forest"
              style={{
                fontWeight: 600,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                marginTop: 18,
                marginBottom: 6,
                padding: "0 6px",
              }}
            >
              Switch city
            </div>
            <div className="flex flex-col">
              {cities.map((c) => {
                const isCurrent = c.slug === currentCity;
                return (
                  <Link
                    key={c.slug}
                    href={`/${c.slug}`}
                    className="list-compact"
                    onClick={close}
                  >
                    <span className="ttl">{c.display_name}</span>
                    <span className="trailing">
                      {isCurrent ? (
                        <span className="tag magenta">Current</span>
                      ) : (
                        <ChevronRight size={14} aria-hidden="true" />
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div
              className="font-display text-forest inline-flex items-center gap-1.5"
              style={{
                fontWeight: 600,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                marginTop: 18,
                marginBottom: 6,
                padding: "0 6px",
              }}
            >
              <Languages size={13} aria-hidden="true" />
              Language
            </div>
            <div className="flex flex-col">
              {LOCALES.map((loc) => {
                const isCurrent = loc === locale;
                return (
                  <button
                    key={loc}
                    type="button"
                    className="list-compact"
                    style={{
                      minHeight: 44,
                      width: "100%",
                      textAlign: "left",
                      borderTop: 0,
                      borderLeft: 0,
                      borderRight: 0,
                      cursor: "pointer",
                      font: "inherit",
                    }}
                    disabled={isPending}
                    aria-current={isCurrent ? "true" : undefined}
                    onClick={() => {
                      if (isCurrent) {
                        close();
                        return;
                      }
                      startTransition(async () => {
                        await setLocale(loc);
                        router.refresh();
                        close();
                      });
                    }}
                  >
                    <span className="ttl">{LOCALE_LABELS[loc].native}</span>
                    <span className="trailing">
                      {isCurrent ? (
                        <Check size={14} aria-hidden="true" />
                      ) : (
                        <span className="text-xs text-muted">
                          {LOCALE_LABELS[loc].english}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
