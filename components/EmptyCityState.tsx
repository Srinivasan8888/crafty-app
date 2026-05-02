import Link from "next/link";
import { Sparkles, Hammer, Store, GraduationCap, CalendarDays } from "lucide-react";

type EmptyCityStateProps = {
  citySlug: string;
  cityName: string;
};

const CTAS = [
  { label: "List a crafter", icon: Hammer, query: "type=crafter" },
  { label: "List a store", icon: Store, query: "type=store" },
  { label: "List a studio", icon: GraduationCap, query: "type=studio" },
  { label: "List an event", icon: CalendarDays, query: "type=event" },
];

export function EmptyCityState({ citySlug, cityName }: EmptyCityStateProps) {
  return (
    <section
      aria-label={`Crafty is opening in ${cityName}`}
      className="relative isolate w-full overflow-hidden bg-canvas-sunken"
    >
      <div className="container mx-auto flex flex-col items-center gap-6 px-4 py-20 text-center md:py-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas-raised px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          <Sparkles size={12} className="text-accent" aria-hidden />
          New city
        </span>

        <h1 className="font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
          Crafty is opening in {cityName}.
        </h1>

        <p className="max-w-2xl text-base text-ink-muted md:text-lg">
          Be the first crafter, store, studio, or event — you'll be the founding listings.
        </p>

        <ul className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {CTAS.map(({ label, icon: Icon, query }) => (
            <li key={label}>
              <Link
                href={`/list-your-profile?city=${citySlug}&${query}`}
                className="btn"
              >
                <Icon size={16} aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default EmptyCityState;
