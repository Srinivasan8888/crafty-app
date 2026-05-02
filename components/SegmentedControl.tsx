"use client";

export type SegTab = { id: string; label: string };

export type SegProps = {
  tabs: SegTab[];
  active: string;
  onChange: (id: string) => void;
  size?: "md" | "sm";
  /**
   * Visual variant.
   *  - "pills" (default): rounded pill control (legacy `.seg` styles).
   *  - "tabs": underline tab strip used on detail pages (`.detail-tabs`).
   */
  variant?: "pills" | "tabs";
};

export function SegmentedControl({ tabs, active, onChange, size = "md", variant = "pills" }: SegProps) {
  const sizeStyle =
    size === "sm" ? ({ fontSize: 12, padding: 2 } as React.CSSProperties) : undefined;
  const className = variant === "tabs" ? "detail-tabs" : "seg";

  return (
    <nav className={className} role="tablist" aria-orientation="horizontal" style={sizeStyle}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`seg-tab-${t.id}`}
            aria-controls={`seg-panel-${t.id}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={isActive ? "active" : ""}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

export type SegmentedSectionProps = {
  id: string;
  active: boolean;
  children: React.ReactNode;
};

export function SegmentedSection({ id, active, children }: SegmentedSectionProps) {
  return (
    <section
      className="seg-section"
      id={`seg-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`seg-tab-${id}`}
      hidden={!active}
    >
      {children}
    </section>
  );
}

export default SegmentedControl;
