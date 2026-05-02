"use client";

import { useState } from "react";
import { SegmentedControl, SegmentedSection } from "@/components/SegmentedControl";

export type SearchSectionKey = "all" | "crafters" | "stores" | "learn" | "events";

export type SearchTabCounts = Record<SearchSectionKey, number>;

type Props = {
  counts: SearchTabCounts;
  craftersSlot: React.ReactNode;
  storesSlot: React.ReactNode;
  studiosSlot: React.ReactNode;
  eventsSlot: React.ReactNode;
};

export function SearchTabs({
  counts,
  craftersSlot,
  storesSlot,
  studiosSlot,
  eventsSlot,
}: Props) {
  const [active, setActive] = useState<SearchSectionKey>("all");

  const tabs: Array<{ id: SearchSectionKey; label: string }> = [
    { id: "all", label: `All ${counts.all}` },
    { id: "crafters", label: `Crafters ${counts.crafters}` },
    { id: "stores", label: `Stores ${counts.stores}` },
    { id: "learn", label: `Learn ${counts.learn}` },
    { id: "events", label: `Events ${counts.events}` },
  ];

  return (
    <>
      <SegmentedControl
        tabs={tabs}
        active={active}
        onChange={(id) => setActive(id as SearchSectionKey)}
      />
      <SegmentedSection id="all" active={active === "all"}>
        {craftersSlot}
        {storesSlot}
        {studiosSlot}
        {eventsSlot}
      </SegmentedSection>
      <SegmentedSection id="crafters" active={active === "crafters"}>
        {craftersSlot}
      </SegmentedSection>
      <SegmentedSection id="stores" active={active === "stores"}>
        {storesSlot}
      </SegmentedSection>
      <SegmentedSection id="learn" active={active === "learn"}>
        {studiosSlot}
      </SegmentedSection>
      <SegmentedSection id="events" active={active === "events"}>
        {eventsSlot}
      </SegmentedSection>
    </>
  );
}

export default SearchTabs;
