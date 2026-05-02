import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Search } from "lucide-react";
import { getCities } from "@/lib/cities";

export async function AppHeader({ city }: { city: string }) {
  const cities = await getCities();
  const current = cities.find((c) => c.slug === city) ?? cities[0];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur">
      <a href="#main" className="skip-link sr-only-focusable">Skip to content</a>
      <div className="container flex h-14 items-center gap-3">
        <Link href={`/${current.slug}`} className="flex shrink-0 items-center">
          <Logo />
        </Link>
        <nav className="hidden gap-1 md:flex">
          {[
            ["Crafters", `/${current.slug}/crafters`],
            ["Stores", `/${current.slug}/stores`],
            ["Learn", `/${current.slug}/learn`],
            ["Events", `/${current.slug}/events`],
          ].map(([label, href]) => (
            <Link key={label as string} href={href as string} className="btn btn-ghost btn-sm">
              {label}
            </Link>
          ))}
        </nav>
        <Link
          href={`/${current.slug}/search`}
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-md border border-line bg-canvas-raised px-3 text-sm text-ink-muted hover:border-ink"
          aria-label="Search"
        >
          <Search size={14} />
          <span>Search Crafty…</span>
        </Link>
        <ThemeToggle />
        <Link href="/list-your-profile" className="hidden btn btn-primary btn-sm sm:inline-flex">
          List your profile
        </Link>
      </div>
    </header>
  );
}
