"use client";

import Link from "next/link";

export type StickyCTAIconButton = {
  ariaLabel: string;
  icon: React.ReactNode;
  onClick?: () => void;
};

export type StickyCTAProps = {
  primaryLabel: string;
  primaryHref?: string;
  primaryOnClick?: () => void;
  primaryVariant?: "forest" | "magenta" | "mustard";
  iconButtons?: StickyCTAIconButton[];
  /** Custom action nodes (rendered after iconButtons). Use for client islands like SaveButton/ShareButton. */
  iconActions?: React.ReactNode;
  primaryIcon?: React.ReactNode;
};

export function StickyCTA({
  primaryLabel,
  primaryHref,
  primaryOnClick,
  primaryVariant = "magenta",
  iconButtons,
  iconActions,
  primaryIcon,
}: StickyCTAProps) {
  const variantClass =
    primaryVariant === "forest"
      ? "btn-forest"
      : primaryVariant === "mustard"
        ? "btn-mustard"
        : "btn-primary";

  const inner = (
    <>
      {primaryIcon && (
        <span className="inline-flex items-center mr-2" aria-hidden="true">
          {primaryIcon}
        </span>
      )}
      <span>{primaryLabel}</span>
    </>
  );

  return (
    <div className="sticky-cta md:hidden" role="region" aria-label="Primary actions">
      {primaryHref ? (
        <Link href={primaryHref} className={`btn ${variantClass}`}>
          {inner}
        </Link>
      ) : (
        <button
          type="button"
          className={`btn ${variantClass}`}
          onClick={primaryOnClick}
        >
          {inner}
        </button>
      )}

      {iconButtons?.map((b, i) => (
        <button
          key={i}
          type="button"
          className="icon-btn"
          aria-label={b.ariaLabel}
          onClick={b.onClick}
        >
          {b.icon}
        </button>
      ))}
      {iconActions}
    </div>
  );
}

export default StickyCTA;
