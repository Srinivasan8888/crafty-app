"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * SafeImage — a thin wrapper around next/image that renders a branded
 * Sunday-Bazaar fallback when the source is missing or fails to load.
 *
 * Why this exists: ~70% of seed Unsplash hotlinks 404 through the
 * /_next/image proxy. Rather than show an empty cream rectangle (or the
 * browser's "broken image" glyph), we paint a soft cream-2/cream-3
 * surface with a small mustard floral mark and a tiny italic Fraunces
 * caption. Works in both `fill` and intrinsic (width/height) modes.
 */
export type SafeImageProps = Omit<ImageProps, "src"> & {
  src: ImageProps["src"] | null | undefined;
};

function isEmptySrc(src: SafeImageProps["src"]): boolean {
  if (src == null) return true;
  if (typeof src === "string") return src.trim().length === 0;
  return false;
}

function FallbackMark({ fill, label }: { fill?: boolean; label?: string }) {
  // Positioning: in `fill` mode the parent is position:relative, so we
  // absolutely fill it. In intrinsic mode we sit in the normal flow
  // and stretch to whatever width/height the consumer asked for.
  const positionClass = fill
    ? "absolute inset-0"
    : "relative h-full w-full";

  return (
    <div
      role="img"
      aria-label={label && label.trim().length > 0 ? label : "No photo yet"}
      className={`${positionClass} flex flex-col items-center justify-center gap-1 overflow-hidden`}
      style={{
        background:
          "linear-gradient(135deg, rgb(var(--cream-2)) 0%, rgb(var(--cream-3)) 100%)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="28"
        height="28"
        aria-hidden="true"
        style={{ color: "rgb(var(--mustard))" }}
      >
        {/* Six-petal floral / asterisk mark */}
        <g fill="currentColor" opacity="0.85">
          <circle cx="12" cy="12" r="2.2" />
          <ellipse cx="12" cy="5"  rx="1.7" ry="3.2" />
          <ellipse cx="12" cy="19" rx="1.7" ry="3.2" />
          <ellipse cx="5"  cy="12" rx="3.2" ry="1.7" />
          <ellipse cx="19" cy="12" rx="3.2" ry="1.7" />
          <ellipse cx="6.9"  cy="6.9"  rx="1.7" ry="3.2" transform="rotate(-45 6.9 6.9)" />
          <ellipse cx="17.1" cy="17.1" rx="1.7" ry="3.2" transform="rotate(-45 17.1 17.1)" />
          <ellipse cx="17.1" cy="6.9"  rx="1.7" ry="3.2" transform="rotate(45 17.1 6.9)" />
          <ellipse cx="6.9"  cy="17.1" rx="1.7" ry="3.2" transform="rotate(45 6.9 17.1)" />
        </g>
      </svg>
      <span
        className="italic"
        style={{
          fontFamily: "var(--font-display)",
          color: "rgb(var(--muted))",
          fontSize: "11px",
          letterSpacing: "0.01em",
        }}
      >
        no photo yet
      </span>
    </div>
  );
}

export default function SafeImage(props: SafeImageProps) {
  const { src, alt, onError, ...rest } = props;
  const [errored, setErrored] = useState(false);

  if (errored || isEmptySrc(src)) {
    return <FallbackMark fill={Boolean(rest.fill)} label={typeof alt === "string" ? alt : undefined} />;
  }

  return (
    <Image
      {...rest}
      src={src as ImageProps["src"]}
      alt={alt}
      onError={(e) => {
        setErrored(true);
        onError?.(e);
      }}
    />
  );
}

export { SafeImage };
