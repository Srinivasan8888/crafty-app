import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { MobileDrawer } from "./MobileDrawer";
import { getCities } from "@/lib/cities";

export async function AppHeader({ city }: { city: string }) {
  const cities = await getCities();
  const current = cities.find((c) => c.slug === city) ?? cities[0];

  const navLinks: Array<[string, string]> = [
    ["Crafters", `/${current.slug}/crafters`],
    ["Stores", `/${current.slug}/stores`],
    ["Learn", `/${current.slug}/learn`],
    ["Events", `/${current.slug}/events`],
  ];

  const drawerCities = cities.map((c) => ({
    slug: c.slug,
    display_name: c.display_name,
  }));

  return (
    <>
      <a href="#main" className="skip-link sr-only-focusable">
        Skip to content
      </a>

      <header
        className="sticky top-0 z-50"
        style={{
          background: "rgb(var(--cream))",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          className="flex items-center gap-3 md:gap-6 px-[18px] md:px-[var(--container-pad)] py-3 md:py-[18px] mx-auto"
          style={{ maxWidth: "var(--container-max)" }}
        >
          {/* Mobile: hamburger drawer */}
          <div className="md:hidden">
            <MobileDrawer cities={drawerCities} currentCity={current.slug} />
          </div>

          {/* Logo (always visible) */}
          <Link
            href={`/${current.slug}`}
            className="inline-flex items-center"
            aria-label="Crafty home"
          >
            <Logo size="md" />
          </Link>

          {/* Desktop primary nav */}
          <nav
            className="hidden md:flex flex-1 gap-6"
            aria-label="Primary"
          >
            {navLinks.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="font-display font-semibold text-[15px]"
                style={{ color: "rgb(var(--ink))" }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Mobile city pill (centered) */}
          <Link
            href={`/${current.slug}`}
            className="md:hidden city-pill inline-flex items-center gap-1 mx-auto"
          >
            <span>{current.display_name}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </Link>

          {/* Right-side actions */}
          <div className="ml-auto flex items-center gap-2 md:gap-3">
            {/* Search: icon on mobile, pill on desktop */}
            <Link
              href={`/${current.slug}/search`}
              className="icon-btn md:hidden"
              aria-label="Search"
            >
              <Search size={16} aria-hidden="true" />
            </Link>
            <Link
              href={`/${current.slug}/search`}
              className="hidden md:inline-flex items-center gap-2"
              aria-label="Search Crafty"
              style={{
                background: "rgb(var(--cream-2))",
                border: "1px solid var(--line-strong)",
                borderRadius: "var(--r-pill)",
                padding: "8px 16px",
                fontSize: 13,
                color: "rgb(var(--muted))",
                minWidth: 220,
              }}
            >
              <Search size={14} aria-hidden="true" />
              <span>Search crafters, stores, events…</span>
            </Link>

            {/* City pill: desktop only (mobile pill is centered above) */}
            <Link
              href={`/${current.slug}`}
              className="city-pill hidden md:inline-flex items-center gap-1"
            >
              <span>{current.display_name}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </Link>

            <ThemeToggle />

            {/* Desktop-only auth + CTA */}
            <Link
              href="/sign-in"
              className="hidden md:inline-flex btn btn-ghost btn-sm"
            >
              Sign in
            </Link>
            <Link
              href="/list-your-profile"
              className="hidden md:inline-flex btn btn-primary btn-sm"
            >
              List your profile
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
