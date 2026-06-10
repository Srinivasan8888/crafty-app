// PRD §7.1 — community moment section. Full-bleed editorial photo + 1-line
// caption that breaks rail rhythm between rails 2 (Stores) and 3 (Learn).
//
// V1 ships a generic moment per city; an admin-curated `community_moment_*`
// JSON field on City unlocks per-city overrides in V1.5. This component reads
// from props so the homepage page.tsx can decide which to pass.

import { SafeImage } from "@/components/SafeImage";

type Props = {
  photoUrl: string;
  caption: string;
};

export function CommunityMoment({ photoUrl, caption }: Props) {
  return (
    <section className="relative my-8 overflow-hidden rounded-xl md:my-12" aria-labelledby="community-moment-caption">
      <div className="relative aspect-[21/9] w-full md:aspect-[21/8]">
        <SafeImage
          src={photoUrl}
          alt=""
          fill
          sizes="(min-width: 1200px) 1200px, 100vw"
          className="object-cover"
          priority={false}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 100%)" }}
        />
      </div>
      <p
        id="community-moment-caption"
        className="absolute bottom-5 left-5 right-5 max-w-xl text-cream font-display text-base italic md:bottom-8 md:left-10 md:text-xl"
      >
        {caption}
      </p>
    </section>
  );
}

// Sensible default for cities without a curated moment yet (per PRD §7.1
// "fall back to a generic Crafty community moment").
export const FALLBACK_COMMUNITY_MOMENT = {
  photoUrl:
    "https://images.unsplash.com/photo-1465379944081-7f47de8d74ac?w=1600&q=80&fit=crop&auto=format",
  caption: "Cubbon Park, Sunday morning. Crafters meeting crafters.",
} as const;
