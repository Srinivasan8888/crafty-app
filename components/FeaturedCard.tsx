import Link from "next/link";
import { Heart } from "lucide-react";
import { SafeImage } from "@/components/SafeImage";

type BadgeVariant = "feat" | "classes" | "claim" | "online";

type Props = {
  href: string;
  imageSrc: string;
  eyebrow: string;
  title: string;
  emHighlight?: string;
  meta: string;
  primaryAction: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  badges?: { label: string; variant: BadgeVariant }[];
};

function renderTitle(title: string, emHighlight?: string) {
  if (!emHighlight) return <>{title}</>;
  const idx = title.indexOf(emHighlight);
  if (idx === -1) return <>{title}</>;
  const before = title.slice(0, idx);
  const after = title.slice(idx + emHighlight.length);
  return (
    <>
      {before}
      <em>{emHighlight}</em>
      {after}
    </>
  );
}

export function FeaturedCard({
  href,
  imageSrc,
  eyebrow,
  title,
  emHighlight,
  meta,
  primaryAction,
  secondaryAction,
  badges,
}: Props) {
  return (
    <article className="featured-card relative overflow-hidden">
      <Link href={href} aria-label={title} className="block">
        <div className="img relative w-full aspect-[16/10] overflow-hidden" style={{ backgroundColor: "rgb(var(--cream-2))" }}>
          <SafeImage
            src={imageSrc}
            alt={title}
            fill
            sizes="(max-width:768px) 100vw, 720px"
            className="object-cover"
            priority
          />
        </div>
      </Link>
      {badges && badges.length > 0 && (
        <div className="badge-row">
          {badges.map((b) => (
            <span key={b.label} className={`badge ${b.variant}`}>
              {b.label}
            </span>
          ))}
        </div>
      )}
      <span className="heart" aria-hidden="true">
        <Heart size={16} />
      </span>
      <div className="body">
        <div className="eyebrow">{eyebrow}</div>
        <h3 className="ttl">
          <Link href={href} className="text-inherit no-underline">
            {renderTitle(title, emHighlight)}
          </Link>
        </h3>
        <p className="meta">{meta}</p>
        <div className="actions">
          <Link href={primaryAction.href} className="btn btn-primary btn-sm">
            {primaryAction.label}
          </Link>
          {secondaryAction && (
            <Link href={secondaryAction.href} className="btn btn-ghost btn-sm">
              {secondaryAction.label}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
