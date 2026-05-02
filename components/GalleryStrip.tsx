"use client";

import { useEffect, useRef, useState } from "react";
import { SafeImage } from "@/components/SafeImage";

export type GalleryProps = {
  images: string[];
  alt?: string;
  aspectRatio?: "1" | "4/5" | "16/9";
};

export function GalleryStrip({ images, alt = "", aspectRatio = "1" }: GalleryProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = stripRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIdx = active;
        let bestRatio = 0;
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.idx);
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIdx = idx;
          }
        }
        if (bestRatio > 0.5) {
          setActive(bestIdx);
        }
      },
      {
        root,
        threshold: [0.25, 0.5, 0.75, 1],
      },
    );

    slideRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [images.length, active]);

  const ratioStyle: React.CSSProperties = { aspectRatio };

  if (!images || images.length === 0) return null;

  return (
    <div>
      <div
        ref={stripRef}
        className="gallery-strip"
        role="region"
        aria-roledescription="carousel"
        aria-label={alt || "Gallery"}
      >
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            data-idx={i}
            className="slide relative"
            role="group"
            aria-roledescription="slide"
            aria-label={`${alt || "Image"} ${i + 1} of ${images.length}`}
            style={ratioStyle}
          >
            <SafeImage
              src={src}
              alt={alt ? `${alt} ${i + 1}` : `Slide ${i + 1}`}
              fill
              sizes="100vw"
              className="object-cover"
              priority={i === 0}
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <div className="snap-dots" aria-hidden="true">
          {images.map((_, i) => (
            <span
              key={i}
              className={`dot${i === active ? " active" : ""}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default GalleryStrip;
