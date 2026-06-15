// V3 — Personalized "For you" rail for the dashboard.
// Server component. Calls lib/recommendations directly.
// Falls back to a soft empty state when the user has too few saves to seed
// a meaningful co-save graph.

import Link from "next/link";
import { SafeImage } from "@/components/SafeImage";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/db";
import { getForYou, publicHrefFor, type RecHit } from "@/lib/recommendations";

type Props = {
  userId: string;
  limit?: number;
};

export async function ForYouSection({ userId, limit = 8 }: Props) {
  const saveCount = await prisma.save.count({ where: { user_id: userId } });

  // Heading + sub stay constant; the body switches between picks and empty state.
  const header = (
    <header>
      <p className="font-display text-xs font-bold uppercase tracking-[3px] text-forest">
        New for you
      </p>
      <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
        Picks based on what you&rsquo;ve saved
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Based on the crafters and studios you&rsquo;ve saved.
      </p>
    </header>
  );

  if (saveCount === 0) {
    return (
      <section className="mt-10">
        {header}
        <div className="mt-4">
          <EmptyState
            variant="mustard"
            title="Save a few you love"
            body="Tap the heart on crafters, stores or studios you like — we'll surface more like them here."
            ctaLabel="Browse crafters"
            ctaHref="/bengaluru/crafters"
          />
        </div>
      </section>
    );
  }

  const hits = await getForYou(userId, limit);
  if (hits.length === 0) {
    return (
      <section className="mt-10">
        {header}
        <div className="mt-4">
          <EmptyState
            variant="plain"
            title="Still gathering picks"
            body="As more people save what you save, your personalized rail will fill in."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      {header}
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {hits.map((h) => (
          <li key={`${h.entity_type}:${h.entity_id}`}>
            <MiniRecCard hit={h} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// Exported so the city landing's "Picks for you in {City}" rail can reuse the
// exact same rec card styling. Renamed export keeps the internal usage intact.
export function RecCard({ hit }: { hit: RecHit }) {
  return <MiniRecCard hit={hit} />;
}

function MiniRecCard({ hit }: { hit: RecHit }) {
  const typeLabel: Record<RecHit["entity_type"], string> = {
    CRAFTER: "Crafter",
    STORE: "Store",
    STUDIO: "Studio",
    EVENT: "Event",
  };
  return (
    <Link
      href={publicHrefFor(hit)}
      className="card group block overflow-hidden"
      aria-label={hit.name}
    >
      <div
        className="relative w-full overflow-hidden bg-canvas-sunken"
        style={{ aspectRatio: "3 / 4" }}
      >
        <SafeImage
          src={hit.image_url ?? null}
          alt={hit.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          {...(hit.blurhash
            ? { placeholder: "blur" as const, blurDataURL: hit.blurhash }
            : {})}
        />
      </div>
      <div className="px-3 py-2.5">
        <p className="truncate font-display text-sm font-semibold text-ink">
          {hit.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {typeLabel[hit.entity_type]} &middot;{" "}
          <span className="capitalize">{hit.city_slug.replace(/-/g, " ")}</span>
        </p>
      </div>
    </Link>
  );
}

export default ForYouSection;
