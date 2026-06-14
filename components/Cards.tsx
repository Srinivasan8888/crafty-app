import Link from "next/link";
import { SafeImage } from "@/components/SafeImage";
import { SaveButton } from "@/components/SaveButton";
import { formatINR } from "@/lib/util";
import { Sparkles } from "lucide-react";

const CARD_SIZES = "(max-width:768px) 50vw, 25vw";

// V3 — Pro pill, matching Featured/Classes badge sizing.
function ProBadge() {
  return (
    <span className="badge" style={{ background: "var(--tint-mustard-mid, rgb(var(--cream-2)))", color: "rgb(var(--magenta))", border: "1px solid rgb(var(--magenta) / 0.3)", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Sparkles size={10} aria-hidden="true" /> Pro
    </span>
  );
}

type SaveOverlayProps = {
  entityType: "crafter" | "store" | "studio" | "event";
  entityId: string;
};

function SaveOverlay({ entityType, entityId }: SaveOverlayProps) {
  return (
    <SaveButton
      variant="icon"
      entityType={entityType}
      entityId={entityId}
      className="heart absolute top-3 right-3 z-10"
    />
  );
}

type CrafterCardProps = {
  id: string;
  city: string;
  slug: string;
  name: string;
  tagline: string | null;
  profile_photo: string;
  profile_photo_blurhash?: string | null;
  categories: string[];
  is_featured?: boolean;
  offers_classes?: boolean;
  owner_is_pro?: boolean;
  priority?: boolean;
};

export function CrafterCard({
  id,
  city,
  slug,
  name,
  tagline,
  profile_photo,
  profile_photo_blurhash,
  categories,
  is_featured,
  offers_classes,
  owner_is_pro,
  priority,
}: CrafterCardProps) {
  const chips = categories.slice(0, 3);
  return (
    <Link href={`/${city}/crafters/${slug}`} className="card block">
      <div className="img relative aspect-square">
        <SafeImage
          src={profile_photo}
          alt={name}
          fill
          sizes={CARD_SIZES}
          className="object-cover"
          priority={priority}
          {...(priority ? { fetchPriority: "high" as const } : {})}
          {...(profile_photo_blurhash
            ? { placeholder: "blur" as const, blurDataURL: profile_photo_blurhash }
            : {})}
        />
        {(is_featured || offers_classes || owner_is_pro) && (
          <div className="badge-row">
            {is_featured && <span className="badge feat">Featured</span>}
            {owner_is_pro && <ProBadge />}
            {offers_classes && <span className="badge classes">Teaches classes</span>}
          </div>
        )}
        <SaveOverlay entityType="crafter" entityId={id} />
      </div>
      <div className="body">
        <div className="title">
          {name}
          {owner_is_pro && <span className="sr-only"> — Crafty Pro member</span>}
        </div>
        {tagline && <p className="muted text-sm line-clamp-2">{tagline}</p>}
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
  id: string;
  city: string;
  slug: string;
  name: string;
  logo_photo: string;
  address: string;
  categories: string[];
  is_online_only?: boolean;
  is_claimed?: boolean;
  owner_is_pro?: boolean;
  priority?: boolean;
};

export function StoreCard({
  id,
  city,
  slug,
  name,
  logo_photo,
  address,
  categories,
  is_online_only,
  is_claimed,
  owner_is_pro,
  priority,
}: StoreCardProps) {
  const locText = is_online_only ? "Online only" : address.split(",")[0];
  return (
    <Link href={`/${city}/stores/${slug}`} className="card block">
      <div className="img relative aspect-[4/3]">
        <SafeImage
          src={logo_photo}
          alt={name}
          fill
          sizes={CARD_SIZES}
          className="object-cover"
          priority={priority}
          {...(priority ? { fetchPriority: "high" as const } : {})}
        />
        {(is_claimed === false || is_online_only || owner_is_pro) && (
          <div className="badge-row">
            {is_claimed === false && <span className="badge claim">Claim this listing</span>}
            {owner_is_pro && <ProBadge />}
            {is_online_only && <span className="badge online">Online only</span>}
          </div>
        )}
        <SaveOverlay entityType="store" entityId={id} />
      </div>
      <div className="body">
        <div className="title">
          {name}
          {owner_is_pro && <span className="sr-only"> — Crafty Pro member</span>}
        </div>
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
  id: string;
  city: string;
  slug: string;
  name: string;
  logo_photo: string;
  address: string;
  age_group?: string | null;
  disciplines: string[];
  owner_is_pro?: boolean;
  priority?: boolean;
};

export function StudioCard({
  id,
  city,
  slug,
  name,
  logo_photo,
  address,
  age_group,
  disciplines,
  owner_is_pro,
  priority,
}: StudioCardProps) {
  return (
    <Link href={`/${city}/learn/${slug}`} className="card block">
      <div className="img relative aspect-square">
        <SafeImage
          src={logo_photo}
          alt={name}
          fill
          sizes={CARD_SIZES}
          className="object-cover"
          priority={priority}
          {...(priority ? { fetchPriority: "high" as const } : {})}
        />
        <div className="badge-row">
          {owner_is_pro && <ProBadge />}
          <span className="badge classes">{age_group ?? "All ages"}</span>
        </div>
        <SaveOverlay entityType="studio" entityId={id} />
      </div>
      <div className="body">
        <div className="title">
          {name}
          {owner_is_pro && <span className="sr-only"> — Crafty Pro member</span>}
        </div>
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
  id: string;
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
  id,
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
  const day = date.toLocaleDateString("en-IN", { day: "2-digit", timeZone: "Asia/Kolkata" });
  const dow = date.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" }).toUpperCase();
  const mon = date.toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" }).toUpperCase();
  const priceLabel = is_free
    ? "Free"
    : price_amount != null && price_amount !== ""
      ? formatINR(Number(price_amount))
      : "Paid";

  return (
    <Link href={`/${city}/events/${slug}`} className="card block">
      <div className="img relative aspect-[16/9]">
        <SafeImage
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
        <SaveOverlay entityType="event" entityId={id} />
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
