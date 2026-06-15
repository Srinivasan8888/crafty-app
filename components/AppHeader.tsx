import Link from "next/link";
import { ChevronDown, Search, Heart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { MobileDrawer } from "./MobileDrawer";
import { PrimaryNavIsland } from "./BottomNav";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { getCities } from "@/lib/cities";
import { readLocaleCookie } from "@/lib/i18n/request";

export async function AppHeader({ city }: { city: string }) {
  const cities = await getCities();
  const current = cities.find((c) => c.slug === city) ?? cities[0];
  const t = await getTranslations("nav");
  const locale = readLocaleCookie();

  const navLinks: Array<[string, string]> = [
    [t("crafters"), `/${current.slug}/crafters`],
    [t("stores"), `/${current.slug}/stores`],
    [t("learn"), `/${current.slug}/learn`],
    [t("events"), `/${current.slug}/events`],
    [t("community"), `/community`],
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
        className="web-hdr sticky top-0 z-50"
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
            <MobileDrawer
              cities={drawerCities}
              currentCity={current.slug}
              locale={locale}
            />
          </div>

          {/* Logo (always visible) */}
          <Link
            href={`/${current.slug}`}
            className="inline-flex items-center"
            aria-label="Crafty home"
          >
            <Logo size="md" />
          </Link>

          {/* Desktop primary nav (client island marks the active section) */}
          <PrimaryNavIsland
            links={navLinks.map(([label, href]) => ({ label, href }))}
          />

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
              aria-label={t("search")}
            >
              <Search size={16} aria-hidden="true" />
            </Link>
            <Link
              href={`/${current.slug}/search`}
              className="hidden md:inline-flex items-center gap-2"
              aria-label={t("search")}
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
              <span>{t("searchPlaceholder")}</span>
            </Link>

            {/* City pill: desktop only (mobile pill is centered above) */}
            <Link
              href={`/${current.slug}`}
              className="city-pill hidden md:inline-flex items-center gap-1"
            >
              <span>{current.display_name}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </Link>

            {/* Saved: reachable while browsing, not just the mobile bottom nav.
                redirect_url brings signed-out buyers back here after sign-in. */}
            <Link
              href="/dashboard/saved?redirect_url=/dashboard/saved"
              className="icon-btn hidden md:inline-flex"
              aria-label={t("saved")}
              title={t("saved")}
            >
              <Heart size={16} aria-hidden="true" />
            </Link>

            <LocaleSwitcher current={locale} />

            <ThemeToggle />

            {/* Desktop-only auth + CTA */}
            <Link
              href="/sign-in"
              className="hidden md:inline-flex btn btn-ghost btn-sm"
            >
              {t("signIn")}
            </Link>
            <Link
              href="/list-your-profile"
              className="hidden md:inline-flex btn btn-primary btn-sm"
            >
              {t("listProfile")}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
