"use client";

import { useState } from "react";

export type SearchSectionKey = "all" | "crafters" | "stores" | "learn" | "events";

export type SearchTabCounts = Record<SearchSectionKey, number>;

type Props = {
  counts: SearchTabCounts;
  craftersSlot: React.ReactNode;
  storesSlot: React.ReactNode;
  studiosSlot: React.ReactNode;
  eventsSlot: React.ReactNode;
};

const TABS: Array<{ id: SearchSectionKey; label: string }> = [
  { id: "all", label: "All" },
  { id: "crafters", label: "Crafters" },
  { id: "stores", label: "Stores" },
  { id: "learn", label: "Learn" },
  { id: "events", label: "Events" },
];

export function SearchTabs({
  counts,
  craftersSlot,
  storesSlot,
  studiosSlot,
  eventsSlot,
}: Props) {
  const [active, setActive] = useState<SearchSectionKey>("all");

  return (
    <>
      <nav
        className="filter-bar"
        role="tablist"
        aria-orientation="horizontal"
        aria-label="Filter search results by type"
        style={{ position: "static", padding: "10px 0", borderBottom: 0 }}
      >
        {TABS.map((t) => {
          const isActive = active === t.id;
          const count = counts[t.id];
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`search-tab-${t.id}`}
              aria-controls={`search-panel-${t.id}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className={`pill${isActive ? " active" : ""}`}
              onClick={() => setActive(t.id)}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}
            >
              <span>{t.label}</span>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 20,
                  height: 18,
                  padding: "0 6px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  lineHeight: 1,
                  background: isActive ? "rgba(255,255,255,0.22)" : "rgb(var(--cream-2))",
                  color: isActive ? "rgb(var(--cream))" : "rgb(var(--forest))",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      <section
        id="search-panel-all"
        role="tabpanel"
        aria-labelledby="search-tab-all"
        hidden={active !== "all"}
      >
        {craftersSlot}
        {storesSlot}
        {studiosSlot}
        {eventsSlot}
      </section>
      <section
        id="search-panel-crafters"
        role="tabpanel"
        aria-labelledby="search-tab-crafters"
        hidden={active !== "crafters"}
      >
        {craftersSlot}
      </section>
      <section
        id="search-panel-stores"
        role="tabpanel"
        aria-labelledby="search-tab-stores"
        hidden={active !== "stores"}
      >
        {storesSlot}
      </section>
      <section
        id="search-panel-learn"
        role="tabpanel"
        aria-labelledby="search-tab-learn"
        hidden={active !== "learn"}
      >
        {studiosSlot}
      </section>
      <section
        id="search-panel-events"
        role="tabpanel"
        aria-labelledby="search-tab-events"
        hidden={active !== "events"}
      >
        {eventsSlot}
      </section>
    </>
  );
}

export default SearchTabs;
