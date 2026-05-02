"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/SegmentedControl";

type Hours = Record<string, string>;

type Props = {
  about: React.ReactNode;
  catalogue: React.ReactNode;
  hours: React.ReactNode;
  findUs: React.ReactNode;
};

const TABS = [
  { id: "about", label: "About" },
  { id: "catalogue", label: "Catalogue" },
  { id: "hours", label: "Hours" },
  { id: "find", label: "Find us" },
];

export function MobileTabs({ about, catalogue, hours, findUs }: Props) {
  const [active, setActive] = useState<string>("about");

  return (
    <div className="md:hidden">
      <div className="seg-wrap" style={{ padding: "18px 18px 6px" }}>
        <SegmentedControl tabs={TABS} active={active} onChange={setActive} />
      </div>
      <section className="seg-section" hidden={active !== "about"}>
        {about}
      </section>
      <section className="seg-section" hidden={active !== "catalogue"}>
        {catalogue}
      </section>
      <section className="seg-section" hidden={active !== "hours"}>
        {hours}
      </section>
      <section className="seg-section" hidden={active !== "find"}>
        {findUs}
      </section>
    </div>
  );
}

export default MobileTabs;
