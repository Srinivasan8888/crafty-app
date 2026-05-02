"use client";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";

type City = { slug: string; display_name: string };

export function CitySelector({ cities, current }: { cities: City[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function switchTo(slug: string) {
    if (slug === current) return;
    // Replace the leading city segment in the path. e.g. /bengaluru/crafters → /mumbai/crafters
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) parts.push(slug);
    else parts[0] = slug;
    const next = "/" + parts.join("/");
    startTransition(() => router.push(next));
  }

  return (
    <div className="snap-rail no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-2">
      {cities.map((c) => (
        <button
          key={c.slug}
          onClick={() => switchTo(c.slug)}
          className="chip whitespace-nowrap"
          data-active={c.slug === current}
          aria-current={c.slug === current ? "true" : undefined}
        >
          {c.display_name}
        </button>
      ))}
    </div>
  );
}
