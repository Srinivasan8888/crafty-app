// V3 — "People who saved this also saved" rail.
// Server component; calls into lib/recommendations directly to skip the HTTP hop.
// Renders nothing when there are no hits (silent absence — don't take up the
// page's vertical real estate just to show "no recommendations").

import Link from "next/link";
import { SafeImage } from "@/components/SafeImage";
import {
  getCoSaves,
  publicHrefFor,
  type RecEntityType,
  type RecHit,
} from "@/lib/recommendations";

type Props = {
  entityType: RecEntityType;
  entityId: string;
  limit?: number;
};

const HEADING_FOR: Record<RecEntityType, string> = {
  CRAFTER: "People who saved this also saved",
  STORE: "People who saved this also saved",
  STUDIO: "People who saved this also saved",
  EVENT: "People going to this also saved",
};

export async function CoSaveRecommendations({ entityType, entityId, limit = 8 }: Props) {
  const hits = await getCoSaves(entityType, entityId, limit);
  if (hits.length === 0) return null;

  return (
    <section className="container mt-10 mb-12">
      <header className="mb-4">
        <p className="font-display text-xs font-bold uppercase tracking-[3px] text-forest">
          Recommended
        </p>
        <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          {HEADING_FOR[entityType]}
        </h2>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {hits.map((h) => (
          <li key={`${h.entity_type}:${h.entity_id}`}>
            <MiniRecCard hit={h} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MiniRecCard({ hit }: { hit: RecHit }) {
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
        <p className="mt-0.5 truncate text-xs capitalize text-ink-muted">
          {hit.city_slug.replace(/-/g, " ")}
        </p>
      </div>
    </Link>
  );
}

export default CoSaveRecommendations;
