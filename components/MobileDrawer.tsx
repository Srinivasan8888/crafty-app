"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Compass,
  Heart,
  Home,
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

type Props = {
  cities: { slug: string; display_name: string }[];
  currentCity: string;
};

export function MobileDrawer({ cities, currentCity }: Props) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);

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
    { href: "/list-your-profile", label: "List your profile", icon: <UserPlus size={16} aria-hidden="true" /> },
    { href: "/sign-in", label: "Sign in", icon: <LogIn size={16} aria-hidden="true" /> },
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
          </aside>
        </>
      )}
    </>
  );
}
