import Link from "next/link";

export type EmptyStateProps = {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
  glyph?: string;
  variant?: "mustard" | "forest" | "magenta" | "plain";
  className?: string;
};

const VARIANT_CLASS: Record<NonNullable<EmptyStateProps["variant"]>, string> = {
  mustard: "tint-mustard",
  forest: "tint-forest",
  magenta: "tint-magenta",
  plain: "",
};

/**
 * Generic empty-state block (Sunday Bazaar style).
 *
 * Server-component-friendly. If `ctaOnClick` is supplied, the consumer must
 * import this from a `"use client"` boundary — the component itself stays
 * markup-only, but a function prop forces the parent to be client.
 */
export function EmptyState({
  title,
  body,
  ctaLabel,
  ctaHref,
  ctaOnClick,
  glyph = "❋",
  variant,
  className,
}: EmptyStateProps) {
  const tint = variant ? VARIANT_CLASS[variant] : "";
  const wrapperClass = ["empty-state", tint, className].filter(Boolean).join(" ");

  let cta: React.ReactNode = null;
  if (ctaLabel) {
    if (ctaOnClick && !ctaHref) {
      cta = (
        <button type="button" className="btn btn-primary" onClick={ctaOnClick}>
          {ctaLabel}
        </button>
      );
    } else if (ctaHref) {
      cta = (
        <Link href={ctaHref} className="btn btn-primary">
          {ctaLabel}
        </Link>
      );
    }
  }

  return (
    <div className={wrapperClass}>
      <div className="glyph">{glyph}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {cta}
    </div>
  );
}

export default EmptyState;
