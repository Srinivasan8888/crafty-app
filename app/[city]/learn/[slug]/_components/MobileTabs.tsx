"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/SegmentedControl";

type Props = {
  about: React.ReactNode;
  disciplines: React.ReactNode;
  schedule: React.ReactNode;
  reviews: React.ReactNode;
};

const TABS = [
  { id: "about", label: "About" },
  { id: "disciplines", label: "Disciplines" },
  { id: "schedule", label: "Schedule" },
  { id: "reviews", label: "Reviews" },
];

export function MobileTabs({ about, disciplines, schedule, reviews }: Props) {
  const [active, setActive] = useState<string>("about");

  return (
    <div className="md:hidden">
      <div className="seg-wrap" style={{ padding: "18px 18px 6px" }}>
        <SegmentedControl tabs={TABS} active={active} onChange={setActive} />
      </div>
      <section className="seg-section" hidden={active !== "about"}>
        {about}
      </section>
      <section className="seg-section" hidden={active !== "disciplines"}>
        {disciplines}
      </section>
      <section className="seg-section" hidden={active !== "schedule"}>
        {schedule}
      </section>
      <section className="seg-section" hidden={active !== "reviews"}>
        {reviews}
      </section>
    </div>
  );
}

export default MobileTabs;
