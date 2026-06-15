"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, X } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";

export type StudioDisciplineOption = {
  slug: string;
  display_name: string;
};

export type AppliedFilter = {
  key: string;
  label: string;
};

type SortOption = "featured" | "newest";

type Props = {
  city: string;
  cityDisplayName: string;
  disciplines: StudioDisciplineOption[];
  activeDisciplineSlug?: string;
  activeOnline?: boolean;
  activeSort?: SortOption;
  appliedFilters: AppliedFilter[];
  total: number;
};

// Only sorts the listing page actually supports. "Featured first" is the
// default ordering; "Newest" sorts purely by recency.
const SORTS: { id: SortOption; label: string }[] = [
  { id: "featured", label: "Featured first" },
  { id: "newest", label: "Newest" },
];

export function StudioFilters({
  city,
  cityDisplayName,
  disciplines,
  activeDisciplineSlug,
  activeOnline = false,
  activeSort = "featured",
  appliedFilters,
  total,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draftDiscipline, setDraftDiscipline] = useState<string | undefined>(activeDisciplineSlug);
  const [draftOnline, setDraftOnline] = useState<boolean>(activeOnline);
  const [draftSort, setDraftSort] = useState<SortOption>(activeSort);

  const baseHref = `/${city}/learn`;

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is city-wide and handled by the search page (parity with the
    // Crafters and Stores listings) — the Learn listing has no `q` handling.
    const q = query.trim();
    router.push(`/${city}/search${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  const onApply = () => {
    const params = new URLSearchParams();
    if (draftDiscipline) params.set("discipline", draftDiscipline);
    if (draftOnline) params.set("online", "1");
    // Only the non-default sort needs a param.
    if (draftSort === "newest") params.set("sort", "newest");
    setOpen(false);
    router.push(`${baseHref}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const clearDrafts = () => {
    setDraftDiscipline(undefined);
    setDraftOnline(false);
    setDraftSort("featured");
  };

  const sheetFooter = (
    <div>
      <button type="button" className="btn btn-primary btn-block" onClick={onApply}>
        Apply (showing {total})
      </button>
      <button
        type="button"
        onClick={clearDrafts}
        className="mt-3 block w-full text-center text-xs font-semibold uppercase tracking-[1px] text-magenta"
      >
        Clear all
      </button>
    </div>
  );

  return (
    <>
      <div className="md:hidden">
        <form onSubmit={onSubmitSearch} className="nav-search" role="search" aria-label="Search studios">
          <label className="search-wrap-mobile">
            <Search
              size={16}
              aria-hidden="true"
              className="text-subtle"
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              className="search-input"
              type="search"
              placeholder={`Search studios in ${cityDisplayName}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="icon-btn bg-magenta text-cream border-magenta"
            aria-label="Open filters"
            onClick={() => setOpen(true)}
            style={{ fontWeight: 700 }}
          >
            <ChevronDown size={16} />
          </button>
        </form>
      </div>

      {appliedFilters.length > 0 && (
        <div className="applied-filters">
          <span className="label">Filters</span>
          {appliedFilters.map((f) => (
            <span key={f.key} className="filter-chip">
              {f.label}
              <button
                type="button"
                className="x focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magenta rounded-full"
                aria-label={`Remove ${f.label} filter`}
                onClick={() => router.push(baseHref)}
                style={{
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
          <a className="clear" href={baseHref}>Clear all</a>
        </div>
      )}

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Filter studios in ${cityDisplayName}`}
        subtitle={`Showing ${total} of ${total}`}
        footer={sheetFooter}
      >
        <div className="mt-1">
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 13,
              fontWeight: 700,
              color: "rgb(var(--ink))",
              textTransform: "uppercase",
              letterSpacing: "1.2px",
              margin: "4px 0 10px",
            }}
          >
            Discipline
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {disciplines.map((d) => {
              const isActive = draftDiscipline === d.slug;
              return (
                <button
                  key={d.slug}
                  type="button"
                  className={`pill w-full${isActive ? " active" : ""}`}
                  onClick={() => setDraftDiscipline(isActive ? undefined : d.slug)}
                  style={{ padding: "9px 6px", fontSize: 12, minHeight: 38 }}
                >
                  {d.display_name}
                </button>
              );
            })}
          </div>

          <SheetGroup title="Other">
            <ToggleRow label="Online only" checked={draftOnline} onChange={setDraftOnline} />
          </SheetGroup>

          <SheetGroup title="Sort by">
            <div className="grid grid-cols-2 gap-1.5">
              {SORTS.map((s) => {
                const isActive = draftSort === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDraftSort(s.id)}
                    className={`pill w-full${isActive ? " active" : ""}`}
                    style={{ padding: "9px 8px", fontSize: 12 }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </SheetGroup>
        </div>
      </BottomSheet>
    </>
  );
}

function SheetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--line)" }}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 13,
          fontWeight: 700,
          color: "rgb(var(--ink))",
          textTransform: "uppercase",
          letterSpacing: "1.2px",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className="flex items-center justify-between border-b py-3 last:border-b-0"
      style={{ borderColor: "var(--line)" }}
    >
      <span className="text-sm font-medium text-ink">
        {label}
      </span>
      <span className="toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
        <span className="slider" />
      </span>
    </label>
  );
}

export default StudioFilters;
