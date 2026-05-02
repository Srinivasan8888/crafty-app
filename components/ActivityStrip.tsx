import Image from "next/image";
import Link from "next/link";
import { Bookmark, Sparkles, ArrowRight } from "lucide-react";

type ActivityStripProps = {
  savesThisWeek: number;
  latestListing?: { name: string; thumb: string; href: string } | null;
  cityName?: string;
};

export function ActivityStrip({
  savesThisWeek,
  latestListing,
  cityName,
}: ActivityStripProps) {
  // Empty state — first-run / no listings yet
  if (!latestListing) {
    return (
      <section
        aria-label="Get started"
        className="card flex flex-col items-start gap-3 p-5 md:flex-row md:items-center md:justify-between md:gap-6"
      >
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Sparkles size={16} className="text-accent" aria-hidden />
            Welcome to Crafty.
          </p>
          <p className="text-sm text-ink-muted">
            Let's get you discovered{cityName ? ` in ${cityName}` : ""}.
          </p>
        </div>
        <Link href="/list-your-profile" className="btn btn-primary btn-sm">
          Create Crafter Profile <ArrowRight size={14} />
        </Link>
      </section>
    );
  }

  return (
    <section
      aria-label="This week on Crafty"
      className="card overflow-hidden"
    >
      {/* Wide variant — md+ */}
      <div className="hidden md:flex md:items-center md:justify-between md:gap-6 md:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
            <Bookmark size={18} aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              This week
            </p>
            <p className="text-base font-semibold text-ink">
              {savesThisWeek} {savesThisWeek === 1 ? "save" : "saves"} across your listings
            </p>
          </div>
        </div>

        <Link
          href={latestListing.href}
          className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-canvas-sunken"
        >
          <span className="text-right">
            <span className="block text-xs text-ink-subtle">Latest listing</span>
            <span className="block text-sm font-semibold text-ink">
              {latestListing.name}
            </span>
          </span>
          <span className="relative h-12 w-12 overflow-hidden rounded-md bg-canvas-sunken">
            <Image
              src={latestListing.thumb}
              alt={latestListing.name}
              fill
              sizes="48px"
              className="object-cover"
            />
          </span>
        </Link>
      </div>

      {/* Compact variant — below md */}
      <div className="md:hidden">
        <div className="flex items-center gap-3 border-b border-line p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft">
            <Bookmark size={16} aria-hidden />
          </span>
          <p className="text-sm">
            <span className="font-semibold">{savesThisWeek}</span>{" "}
            <span className="text-ink-muted">
              {savesThisWeek === 1 ? "save" : "saves"} this week
            </span>
          </p>
        </div>
        <Link
          href={latestListing.href}
          className="flex items-center gap-3 p-4 transition-colors hover:bg-canvas-sunken"
        >
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-canvas-sunken">
            <Image
              src={latestListing.thumb}
              alt={latestListing.name}
              fill
              sizes="40px"
              className="object-cover"
            />
          </span>
          <span className="flex-1 truncate">
            <span className="block text-xs text-ink-subtle">Latest listing</span>
            <span className="block truncate text-sm font-semibold">
              {latestListing.name}
            </span>
          </span>
          <ArrowRight size={14} className="text-ink-subtle" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

export default ActivityStrip;
