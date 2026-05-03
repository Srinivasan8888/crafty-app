"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, X } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";

export type CrafterCategoryOption = {
  slug: string;
  display_name: string;
};

export type AppliedFilter = {
  key: string;
  label: string;
  resetHref?: string;
};

type SortOption = "newest" | "popular" | "featured" | "saves";

type Props = {
  city: string;
  cityDisplayName: string;
  categories: CrafterCategoryOption[];
  activeCategorySlug?: string;
  appliedFilters: AppliedFilter[];
  total: number;
};

const NEIGHBOURHOODS: { slug: string; label: string; count: number }[] = [
  { slug: "indiranagar", label: "Indiranagar", count: 23 },
  { slug: "whitefield", label: "Whitefield", count: 18 },
  { slug: "koramangala", label: "Koramangala", count: 31 },
  { slug: "hsr-layout", label: "HSR Layout", count: 15 },
  { slug: "jayanagar", label: "Jayanagar", count: 11 },
  { slug: "malleshwaram", label: "Malleshwaram", count: 9 },
  { slug: "jp-nagar", label: "JP Nagar", count: 12 },
];

const SORTS: { id: SortOption; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "popular", label: "Popular" },
  { id: "featured", label: "Featured first" },
  { id: "saves", label: "Most saves" },
];

export function CrafterFilters({
  city,
  cityDisplayName,
  categories,
  activeCategorySlug,
  appliedFilters,
  total,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draftCategory, setDraftCategory] = useState<string | undefined>(activeCategorySlug);
  const [draftNbhds, setDraftNbhds] = useState<Set<string>>(new Set());
  const [draftFlags, setDraftFlags] = useState<{ teaches: boolean; available: boolean; featured: boolean }>({
    teaches: true,
    available: false,
    featured: true,
  });
  const [draftSort, setDraftSort] = useState<SortOption>("newest");
  const [draftDistance, setDraftDistance] = useState(9);

  const baseHref = `/${city}/crafters`;

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (activeCategorySlug) params.set("category", activeCategorySlug);
    router.push(`${baseHref}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const toggleNbhd = (slug: string) => {
    setDraftNbhds((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const onApply = () => {
    const params = new URLSearchParams();
    if (draftCategory) params.set("category", draftCategory);
    if (draftNbhds.size > 0) params.set("nbhd", Array.from(draftNbhds).join(","));
    if (draftFlags.teaches) params.set("teaches", "1");
    if (draftFlags.available) params.set("available", "1");
    if (draftFlags.featured) params.set("featured", "1");
    if (draftSort !== "newest") params.set("sort", draftSort);
    if (draftDistance !== 20) params.set("dist", String(draftDistance));
    setOpen(false);
    router.push(`${baseHref}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const clearDrafts = () => {
    setDraftCategory(undefined);
    setDraftNbhds(new Set());
    setDraftFlags({ teaches: false, available: false, featured: false });
    setDraftSort("newest");
    setDraftDistance(20);
  };

  const sheetFooter = (
    <div>
      <button type="button" className="btn btn-primary btn-block" onClick={onApply}>
        Apply (showing {total})
      </button>
      <button
        type="button"
        onClick={clearDrafts}
        className="mt-3 block w-full text-center text-xs font-semibold uppercase tracking-[1px] text-magenta hover:opacity-80"
      >
        Clear all
      </button>
    </div>
  );

  return (
    <>
      <div className="md:hidden">
        <form
          onSubmit={onSubmitSearch}
          className="nav-search"
          role="search"
          aria-label="Search crafters"
        >
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
              placeholder={`Search crafters in ${cityDisplayName}`}
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
                onClick={() => router.push(f.resetHref ?? baseHref)}
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
          <a className="clear" href={baseHref}>
            Clear all
          </a>
        </div>
      )}

      <div className="filter-bar">
        <a
          href={baseHref}
          className={`pill${!activeCategorySlug ? " active" : ""}`}
        >
          All
        </a>
        {categories.slice(0, 9).map((c) => (
          <a
            key={c.slug}
            href={`${baseHref}?category=${c.slug}`}
            className={`pill${activeCategorySlug === c.slug ? " active" : ""}`}
          >
            {c.display_name}
          </a>
        ))}
        <button
          type="button"
          className="pill bg-cream-2 border-mustard-dark text-mustard-dark"
          onClick={() => setOpen(true)}
          style={{ fontWeight: 700 }}
        >
          More <ChevronDown size={12} style={{ display: "inline-block", verticalAlign: "middle" }} />
        </button>
      </div>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Filter crafters in ${cityDisplayName}`}
        subtitle={`Showing ${total} of ${total}`}
        footer={sheetFooter}
      >
        <div className="mt-1">
          <div
            className="font-display"
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
            Category
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {categories.map((c) => {
              const isActive = draftCategory === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  className={`pill w-full${isActive ? " active" : ""}`}
                  onClick={() => setDraftCategory(isActive ? undefined : c.slug)}
                  style={{ padding: "9px 6px", fontSize: 12, minHeight: 38 }}
                >
                  {c.display_name}
                </button>
              );
            })}
          </div>

          <SheetGroup title="Neighbourhood">
            {NEIGHBOURHOODS.map((n) => {
              const checked = draftNbhds.has(n.slug);
              return (
                <label
                  key={n.slug}
                  className="flex items-center justify-between border-b py-3 last:border-b-0"
                  style={{ borderColor: "var(--line)" }}
                >
                  <span className="text-sm font-medium text-ink">
                    {n.label}{" "}
                    <span className="text-subtle" style={{ fontSize: 11.5, fontWeight: 500 }}>
                      {n.count}
                    </span>
                  </span>
                  <span className="toggle">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleNbhd(n.slug)}
                      aria-label={`Toggle ${n.label}`}
                    />
                    <span className="slider" />
                  </span>
                </label>
              );
            })}
          </SheetGroup>

          <SheetGroup title="Other">
            <ToggleRow
              label="Teaches classes"
              checked={draftFlags.teaches}
              onChange={(v) => setDraftFlags((f) => ({ ...f, teaches: v }))}
            />
            <ToggleRow
              label="Available now"
              checked={draftFlags.available}
              onChange={(v) => setDraftFlags((f) => ({ ...f, available: v }))}
            />
            <ToggleRow
              label="Featured first"
              checked={draftFlags.featured}
              onChange={(v) => setDraftFlags((f) => ({ ...f, featured: v }))}
            />
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

          <SheetGroup title="Distance">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Within</span>
              <strong className="text-ink" style={{ fontWeight: 700 }}>
                {draftDistance} km of MG Road
              </strong>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={draftDistance}
              onChange={(e) => setDraftDistance(Number(e.target.value))}
              aria-label="Distance in km"
              className="mt-2 w-full"
              style={{ accentColor: "rgb(var(--magenta))" }}
            />
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
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
        />
        <span className="slider" />
      </span>
    </label>
  );
}

export default CrafterFilters;
