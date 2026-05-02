import Link from "next/link";
import Image from "next/image";
import { MapPin, Calendar, Sparkles, Heart } from "lucide-react";
import { formatDateShort, formatINR } from "@/lib/util";

const CARD_SIZES = "(max-width:768px) 50vw, 25vw";

function HeartPlaceholder() {
  // Server-rendered placeholder. A follow-up will swap this for a client SaveButton.
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-canvas/95 text-ink shadow-md ring-1 ring-line"
    >
      <Heart size={16} />
    </span>
  );
}

type CrafterCardProps = {
  city: string;
  slug: string;
  name: string;
  tagline: string | null;
  profile_photo: string;
  categories: string[];
  is_featured?: boolean;
  offers_classes?: boolean;
  priority?: boolean;
};

export function CrafterCard({ city, slug, name, tagline, profile_photo, categories, is_featured, offers_classes, priority }: CrafterCardProps) {
  return (
    <Link href={`/${city}/crafters/${slug}`} className="card card-hover block">
      <div className="relative aspect-square w-full overflow-hidden bg-canvas-sunken">
        <Image
          src={profile_photo}
          alt={name}
          width={240}
          height={240}
          sizes={CARD_SIZES}
          className="h-full w-full object-cover"
          priority={priority}
          {...(priority ? { fetchPriority: "high" as const } : {})}
        />
        {is_featured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-bold">
            <Sparkles size={12} /> Featured
          </span>
        )}
        <HeartPlaceholder />
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-1 text-base font-semibold">{name}</h3>
        {tagline && <p className="line-clamp-2 text-sm text-ink-muted">{tagline}</p>}
        <div className="flex flex-wrap gap-1">
          {categories.slice(0, 3).map((c) => (
            <span key={c} className="rounded-full bg-canvas-sunken px-2 py-0.5 text-xs text-ink-muted">{c}</span>
          ))}
          {offers_classes && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold">Teaches</span>
          )}
        </div>
      </div>
    </Link>
  );
}

type StoreCardProps = {
  city: string;
  slug: string;
  name: string;
  logo_photo: string;
  address: string;
  categories: string[];
  is_online_only?: boolean;
  is_claimed?: boolean;
  priority?: boolean;
};
export function StoreCard({ city, slug, name, logo_photo, address, categories, is_online_only, is_claimed, priority }: StoreCardProps) {
  return (
    <Link href={`/${city}/stores/${slug}`} className="card card-hover block">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-canvas-sunken">
        <Image
          src={logo_photo}
          alt={name}
          width={280}
          height={210}
          sizes={CARD_SIZES}
          className="h-full w-full object-cover"
          priority={priority}
          {...(priority ? { fetchPriority: "high" as const } : {})}
        />
        <HeartPlaceholder />
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-1 text-base font-semibold">{name}</h3>
        <p className="flex items-center gap-1 text-xs text-ink-muted">
          <MapPin size={12} />
          {is_online_only ? "Online only" : address.split(",")[0]}
        </p>
        <div className="flex flex-wrap gap-1">
          {categories.slice(0, 3).map((c) => (
            <span key={c} className="rounded-full bg-canvas-sunken px-2 py-0.5 text-xs text-ink-muted">{c}</span>
          ))}
          {is_claimed === false && (
            <span className="rounded-full bg-canvas-sunken px-2 py-0.5 text-xs italic text-ink-subtle">unclaimed</span>
          )}
        </div>
      </div>
    </Link>
  );
}

type StudioCardProps = {
  city: string;
  slug: string;
  name: string;
  logo_photo: string;
  address: string;
  age_group: string | null;
  disciplines: string[];
  priority?: boolean;
};
export function StudioCard({ city, slug, name, logo_photo, address, age_group, disciplines, priority }: StudioCardProps) {
  return (
    <Link href={`/${city}/learn/${slug}`} className="card card-hover block">
      <div className="relative aspect-square w-full overflow-hidden bg-canvas-sunken">
        <Image
          src={logo_photo}
          alt={name}
          width={240}
          height={240}
          sizes={CARD_SIZES}
          className="h-full w-full object-cover"
          priority={priority}
          {...(priority ? { fetchPriority: "high" as const } : {})}
        />
        <HeartPlaceholder />
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-1 text-base font-semibold">{name}</h3>
        <p className="flex items-center gap-1 text-xs text-ink-muted">
          <MapPin size={12} />
          {address.split(",")[0]}
        </p>
        <div className="flex flex-wrap gap-1">
          {disciplines.slice(0, 3).map((d) => (
            <span key={d} className="rounded-full bg-canvas-sunken px-2 py-0.5 text-xs text-ink-muted">{d}</span>
          ))}
          {age_group && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs">{age_group}</span>}
        </div>
      </div>
    </Link>
  );
}

type EventCardProps = {
  city: string;
  slug: string;
  name: string;
  cover_image: string;
  start_at: Date;
  venue_name: string;
  is_free: boolean;
  price_amount?: string | number | null;
  event_type: string;
  priority?: boolean;
};
export function EventCard({ city, slug, name, cover_image, start_at, venue_name, is_free, price_amount, event_type, priority }: EventCardProps) {
  return (
    <Link href={`/${city}/events/${slug}`} className="card card-hover block">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-canvas-sunken">
        <Image
          src={cover_image}
          alt={name}
          width={280}
          height={158}
          sizes={CARD_SIZES}
          className="h-full w-full object-cover"
          priority={priority}
          {...(priority ? { fetchPriority: "high" as const } : {})}
        />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-1 text-xs font-bold">
          <Calendar size={12} /> {formatDateShort(new Date(start_at))}
        </span>
        <HeartPlaceholder />
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-1 text-base font-semibold">{name}</h3>
        <p className="line-clamp-1 text-xs text-ink-muted"><MapPin size={12} className="-mt-0.5 inline" /> {venue_name}</p>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-canvas-sunken px-2 py-0.5 text-xs text-ink-muted">{event_type.toLowerCase()}</span>
          <span className="text-xs font-bold">
            {is_free ? "Free" : (price_amount ? formatINR(Number(price_amount)) : "Paid")}
          </span>
        </div>
      </div>
    </Link>
  );
}
