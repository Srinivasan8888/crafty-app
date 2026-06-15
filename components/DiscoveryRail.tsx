import { Children, cloneElement, isValidElement } from "react";
import Link from "next/link";

type Props = {
  title: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  count: number;
  emptyText?: string;
  emptyCta?: { href: string; label: string };
  children: React.ReactNode;
  priorityFirstCard?: boolean;
};

function renderTitle(title: string) {
  const match = title.match(/^(.*) in (.+)$/);
  if (match) {
    const [, head, city] = match;
    return (
      <h2>
        {head} in <em>{city}</em>
      </h2>
    );
  }
  const parts = title.split(" ");
  if (parts.length > 1) {
    const last = parts.pop()!;
    return (
      <h2>
        {parts.join(" ")} <em>{last}</em>
      </h2>
    );
  }
  return <h2>{title}</h2>;
}

export function DiscoveryRail({
  title,
  seeAllHref,
  seeAllLabel = "See all",
  count,
  emptyText,
  emptyCta,
  children,
  priorityFirstCard = false,
}: Props) {
  // Mixed/curated rails (e.g. "New this week", "Picks for you") have no single
  // listing page — omit seeAllHref and we render no (dead) See-all link.
  let priorityApplied = false;
  const decoratedChildren = priorityFirstCard
    ? Children.map(children, (child) => {
        if (priorityApplied) return child;
        if (!isValidElement(child)) return child;
        priorityApplied = true;
        const inner = (child.props as { children?: React.ReactNode }).children;
        if (isValidElement(inner)) {
          const innerWithPriority = cloneElement(
            inner as React.ReactElement<{ priority?: boolean }>,
            { priority: true },
          );
          return cloneElement(
            child as React.ReactElement<{ children?: React.ReactNode }>,
            { children: innerWithPriority },
          );
        }
        return cloneElement(child as React.ReactElement<{ priority?: boolean }>, {
          priority: true,
        });
      })
    : children;

  return (
    <section>
      <div className="sec-title-bar">
        {renderTitle(title)}
        {count > 0 && seeAllHref && (
          <Link href={seeAllHref} className="see-all">
            {seeAllLabel} &rarr;
          </Link>
        )}
      </div>
      {count === 0 ? (
        <div className="px-[18px] pb-[18px]">
          <div className="empty-state">
            <div className="glyph">&#10043;</div>
            <p>{emptyText ?? "Nothing here yet."}</p>
            {emptyCta && (
              <Link href={emptyCta.href} className="btn btn-mustard btn-sm">
                {emptyCta.label}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="rail">{decoratedChildren}</div>
      )}
      <div className="motif" />
    </section>
  );
}
