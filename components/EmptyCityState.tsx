import { EmptyState } from "@/components/EmptyState";

type EmptyCityStateProps = {
  citySlug: string;
  cityName: string;
};

export function EmptyCityState({ citySlug, cityName }: EmptyCityStateProps) {
  return (
    <section
      aria-label={`Crafty is opening in ${cityName}`}
      className="container mx-auto px-4 py-12 md:py-16"
    >
      <EmptyState
        glyph="❋"
        variant="mustard"
        title={`Crafty is just starting in ${cityName}.`}
        body="Be among the first to list your profile. Crafters, stores, studios, and events from your city — you'll be the founding listings."
        ctaLabel="List your profile"
        ctaHref={`/list-your-profile?city=${citySlug}`}
      />
    </section>
  );
}

export default EmptyCityState;
