import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { formatINR } from "@/lib/util";

const CARD_SIZES = "(max-width:768px) 50vw, 25vw";

function HeartOverlay() {
  return (
    <span className="heart" aria-hidden="true">
      <Heart size={15} />
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

export function CrafterCard({
  city,
  slug,
  name,
  tagline,
  profile_photo,
  categories,
  is_featured,
  offers_classes,
  priority,
}: CrafterCardProps) {
  const neighborhood = categories[0] ?? null;
  const chips = categories.slice(neighborhood ? 1 : 0, neighborhood ? 4 : 3);
  return (
    <Link href={`/${city}/crafters/${slug}`} className="card block">
      <div className="img relative aspect-square">
        <Image
          src={profile_photo}
          alt={name}
          fill
          sizes={CARD_SIZES}
          className="object-cover"
          priority={priority}
          {...(priority ? { fetchPriority: "high" as const } : {})}
        />
        {(is_featured || offers_classes) && (
          <div className="badge-row">
            {is_featured && <span className="badge feat">Featured</span>}
            {offers_classes && <span className="badge classes">Teaches classes</span>}
          </div>
        )}
        <HeartOverlay />
      </div>
      <div className="body">
        <div className="title">{name}</div>
        {tagline && <p className="muted text-sm line-clamp-2">{tagline}</p>}
        {neighborhood && <div className="loc">{neighborhood}</div>}
        {chips.length > 0 && (
          <div className="chips">
            {chips.map((c) => (
              <span key={c} className="chip">{c}</span>
            ))}
          </div>
        )}
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

export function StoreCard({
  city,
  slug,
  name,
  logo_photo,
  address,
  categories,
  is_online_only,
  is_claimed,
  priority,
}: StoreCardProps) {
  const locText = is_online_only ? "Online only" : address.split(",")[0];
  return (
    <Link href={`/${city}/stores/${slug}`} className="card block">
      <div className="img relative aspect-square">
        <Image
          src={logo_photo}
          alt={name}
          fill
          sizes={CARD_SIZES}
          className="object-cover"
          priority={priority}
          {...(priority ? { fetchPriority: "high" as const } : {})}
        />
        {(is_claimed === false || is_online_only) && (
          <div className="badge-row">
            {is_claimed === false && <span className="badge claim">Claim this listing</span>}
            {is_online_only && <span className="badge online">Online only</span>}
          </div>
        )}
        <HeartOverlay />
      </div>
      <div className="body">
        <div className="title">{name}</div>
        <div className="loc">{locText}</div>
        {categories.length > 0 && (
          <div className="chips">
            {categories.slice(0, 3).map((c) => (
              <span key={c} className="chip">{c}</span>
            ))}
          </div>
        )}
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
  age_group?: string | null;
  disciplines: string[];
  priority?: boolean;
};

export function StudioCard({
  city,
  slug,
  name,
  logo_photo,
  address,
  age_group,
  disciplines,
  priority,
}: StudioCardProps) {
  return (
    <Link href={`/${city}/learn/${slug}`} className="card block">
      <div className="img relative aspect-square">
        <Image
          src={logo_photo}
          alt={name}
          fill
          sizes={CARD_SIZES}
          className="object-cover"
          priority={priority}
          {...(priority ? { fetchPriority: "high" as const } : {})}
        />
        <div className="badge-row">
          <span className="badge classes">{age_group ?? "All ages"}</span>
        </div>
        <HeartOverlay />
      </div>
      <div className="body">
        <div className="title">{name}</div>
        <div className="loc">{address.split(",")[0]}</div>
        {disciplines.length > 0 && (
          <div className="chips">
            {disciplines.slice(0, 3).map((d) => (
              <span key={d} className="chip">{d}</span>
            ))}
          </div>
        )}
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
  event_type?: string;
  priority?: boolean;
};

export function EventCard({
  city,
  slug,
  name,
  cover_image,
  start_at,
  venue_name,
  is_free,
  price_amount,
  priority,
}: EventCardProps) {
  const date = new Date(start_at);
  const day = date.toLocaleDateString("en-IN", { day: "2-digit" });
  const dow = date.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase();
  const mon = date.toLocaleDateString("en-IN", { month: "short" }).toUpperCase();
  const priceLabel = is_free
    ? "Free"
    : price_amount != null && price_amount !== ""
      ? formatINR(Number(price_amount))
      : "Paid";

  return (
    <Link href={`/${city}/events/${slug}`} className="card block">
      <div className="img relative aspect-[16/9]">
        <Image
          src={cover_image}
          alt={name}
          fill
          sizes={CARD_SIZES}
          className="object-cover"
          priority={priority}
          {...(priority ? { fetchPriority: "high" as const } : {})}
        />
        <div className="date-badge">
          <span className="d">{day}</span>
          {dow} {mon}
        </div>
        <HeartOverlay />
      </div>
      <div className="body">
        <div className="title">{name}</div>
        <div className="loc">{venue_name}</div>
        <div className="chips">
          <span className={is_free ? "price-pill free" : "price-pill"}>{priceLabel}</span>
        </div>
      </div>
    </Link>
  );
}
