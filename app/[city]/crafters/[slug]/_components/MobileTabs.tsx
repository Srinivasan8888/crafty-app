"use client";

import { useState, type ReactNode } from "react";
import { SegmentedControl, SegmentedSection } from "@/components/SegmentedControl";

type TabId = "about" | "portfolio" | "products" | "classes";

type Props = {
  aboutContent: ReactNode;
  portfolioContent: ReactNode;
  productsContent: ReactNode;
  classesContent: ReactNode;
};

const TABS: { id: TabId; label: string }[] = [
  { id: "about", label: "About" },
  { id: "portfolio", label: "Portfolio" },
  { id: "products", label: "Products" },
  { id: "classes", label: "Classes" },
];

export function MobileTabs({
  aboutContent,
  portfolioContent,
  productsContent,
  classesContent,
}: Props) {
  const [active, setActive] = useState<TabId>("about");

  return (
    <>
      <div className="seg-wrap">
        <SegmentedControl
          tabs={TABS}
          active={active}
          onChange={(id) => setActive(id as TabId)}
        />
      </div>

      <SegmentedSection id="about" active={active === "about"}>
        {aboutContent}
      </SegmentedSection>
      <SegmentedSection id="portfolio" active={active === "portfolio"}>
        {portfolioContent}
      </SegmentedSection>
      <SegmentedSection id="products" active={active === "products"}>
        {productsContent}
      </SegmentedSection>
      <SegmentedSection id="classes" active={active === "classes"}>
        {classesContent}
      </SegmentedSection>
    </>
  );
}

export default MobileTabs;
