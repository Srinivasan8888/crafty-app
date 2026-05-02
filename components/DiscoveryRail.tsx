import { Children, cloneElement, isValidElement } from "react";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";

type Props = {
  title: string;
  seeAllHref: string;
  seeAllLabel?: string;
  emptyText?: string;
  emptyCta?: { href: string; label: string };
  children: React.ReactNode;
  count?: number;
  /**
   * If true, the first card rendered in this rail (idx === 0) gets priority,
   * which propagates to the underlying <Image priority fetchPriority="high">.
   * Use on the rail responsible for LCP (typically the first rail above the fold).
   */
  priorityFirstCard?: boolean;
};

export function DiscoveryRail({ title, seeAllHref, seeAllLabel = "See all", emptyText, emptyCta, children, count = 0, priorityFirstCard = false }: Props) {
  // Recursively walk children so a wrapping <div> per card doesn't block prop propagation.
  // We tag the first valid element with priority. The wrapper <div> doesn't accept `priority`,
  // so we clone its single child (the actual card) instead when needed.
  let priorityApplied = false;
  const decoratedChildren = priorityFirstCard
    ? Children.map(children, (child) => {
        if (priorityApplied) return child;
        if (!isValidElement(child)) return child;
        priorityApplied = true;
        // child is the rail-item wrapper <div>; clone its inner child (the Card) with priority.
        const inner = (child.props as { children?: React.ReactNode }).children;
        if (isValidElement(inner)) {
          const innerWithPriority = cloneElement(inner as React.ReactElement<{ priority?: boolean }>, {
            priority: true,
          });
          return cloneElement(child as React.ReactElement<{ children?: React.ReactNode }>, {
            children: innerWithPriority,
          });
        }
        // Fallback: try to pass priority directly on the child if it accepts it.
        return cloneElement(child as React.ReactElement<{ priority?: boolean }>, { priority: true });
      })
    : children;

  return (
    <section className="container my-10">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        {count > 0 && (
          <Link href={seeAllHref} className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-accent">
            {seeAllLabel} <ChevronRight size={16} />
          </Link>
        )}
      </div>
      {count === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-canvas-sunken/40 p-10 text-center">
          <Sparkles className="text-ink-subtle" size={28} />
          <p className="text-sm text-ink-muted">{emptyText ?? "Nothing here yet."}</p>
          {emptyCta && (
            <Link href={emptyCta.href} className="btn btn-primary btn-sm">{emptyCta.label}</Link>
          )}
        </div>
      ) : (
        <div className="snap-rail no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {decoratedChildren}
        </div>
      )}
    </section>
  );
}
