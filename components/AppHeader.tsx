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

      <header className="app-hdr md:hidden">
        <MobileDrawer cities={drawerCities} currentCity={current.slug} />
        <Link href={`/${current.slug}`} className="city-pill inline-flex items-center gap-1">
          <span>{current.display_name}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </Link>
        <Link
          href={`/${current.slug}/search`}
          className="icon-btn justify-self-end"
          aria-label="Search"
        >
          <Search size={16} aria-hidden="true" />
        </Link>
      </header>

      <header className="web-hdr hidden md:block">
        <div className="row">
          <Link href={`/${current.slug}`} className="inline-flex items-center">
            <Logo size="md" />
          </Link>
          <nav>
            {navLinks.map(([label, href]) => (
              <Link key={label} href={href} className="font-display">
                {label}
              </Link>
            ))}
          </nav>
          <div className="actions">
            <Link
              href={`/${current.slug}/search`}
              className="search inline-flex items-center gap-2"
              aria-label="Search Crafty"
            >
              <Search size={14} aria-hidden="true" />
              <span>Search crafters, stores, events…</span>
            </Link>
            <Link
              href={`/${current.slug}`}
              className="city-pill inline-flex items-center gap-1"
            >
              <span>{current.display_name}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </Link>
            <ThemeToggle />
            <Link href="/sign-in" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link href="/list-your-profile" className="btn btn-primary btn-sm">
              List your profile
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
