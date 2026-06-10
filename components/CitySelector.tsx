// V3 — CitySelector now supports two modes:
//   - default (server component): a row of pills linking to /${slug}.
//   - multi (client island): popover with checkboxes that builds a search URL
//     like /${cityFromUrl}/search?q=…&cities=a,b,c on Apply.
//
// We split the implementations: the default flow stays a pure server component,
// the multi flow uses a thin client popover but the parent server page is
// otherwise unchanged.

import Link from "next/link";
import { Plus } from "lucide-react";
import { CitySelectorMulti } from "./CitySelectorMulti";

type City = { slug: string; display_name: string };

type Props = {
  cities: City[];
  current: string;
  /** V1.5 — show "+ Add my city" trailing pill that scrolls to the request banner. */
  showAddMyCity?: boolean;
  /** V3 — multi-select mode (search page). */
  multi?: boolean;
  /** Multi-mode only: current query — preserved when applying selection. */
  currentQuery?: string;
  /** Multi-mode only: slugs that should start checked. */
  initiallySelected?: string[];
};

export function CitySelector({
  cities,
  current,
  showAddMyCity = true,
  multi = false,
  currentQuery,
  initiallySelected,
}: Props) {
  if (multi) {
    return (
      <CitySelectorMulti
        cities={cities}
        current={current}
        currentQuery={currentQuery ?? ""}
        initiallySelected={initiallySelected ?? [current]}
      />
    );
  }

  return (
    <nav className="pillrow" aria-label="Choose city">
      {cities.map((c) => (
        <Link
          key={c.slug}
          href={`/${c.slug}`}
          className={`pill ${current === c.slug ? "active" : ""}`}
          aria-current={current === c.slug ? "page" : undefined}
        >
          {c.display_name}
        </Link>
      ))}
      {showAddMyCity && (
        <a
          href="#request-city"
          className="pill"
          aria-label="Request your city"
          style={{ fontStyle: "italic" }}
        >
          <Plus size={12} aria-hidden style={{ display: "inline", marginRight: 4 }} />
          Add my city
        </a>
      )}
    </nav>
  );
}
