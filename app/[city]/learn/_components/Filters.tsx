"use client";

import { useMemo, useState } from "react";
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

type SortOption = "newest" | "popular" | "featured" | "saves";

type Props = {
  city: string;
  cityDisplayName: string;
  disciplines: StudioDisciplineOption[];
  activeDisciplineSlug?: string;
  appliedFilters: AppliedFilter[];
  total: number;
};

const NEIGHBOURHOODS: { slug: string; label: string; count: number }[] = [
  { slug: "indiranagar", label: "Indiranagar", count: 12 },
  { slug: "koramangala", label: "Koramangala", count: 14 },
  { slug: "jayanagar", label: "Jayanagar", count: 9 },
  { slug: "hsr-layout", label: "HSR Layout", count: 7 },
  { slug: "whitefield", label: "Whitefield", count: 6 },
  { slug: "malleshwaram", label: "Malleshwaram", count: 5 },
];

const AGE_GROUPS: { slug: string; label: string }[] = [
  { slug: "kids", label: "Kids" },
  { slug: "teens", label: "Teens" },
  { slug: "adults", label: "Adults" },
  { slug: "all-ages", label: "All ages" },
];

const SORTS: { id: SortOption; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "popular", label: "Popular" },
  { id: "featured", label: "Featured first" },
  { id: "saves", label: "Most saves" },
];

export function StudioFilters({
  city,
  cityDisplayName,
  disciplines,
  activeDisciplineSlug,
  appliedFilters,
  total,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draftDiscipline, setDraftDiscipline] = useState<string | undefined>(activeDisciplineSlug);
  const [draftNbhds, setDraftNbhds] = useState<Set<string>>(new Set());
  const [draftAges, setDraftAges] = useState<Set<string>>(new Set());
  const [draftFlags, setDraftFlags] = useState<{ online: boolean; trial: boolean; featured: boolean }>({
    online: false,
    trial: false,
    featured: true,
  });
  const [draftSort, setDraftSort] = useState<SortOption>("newest");

  const baseHref = `/${city}/learn`;

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (activeDisciplineSlug) params.set("discipline", activeDisciplineSlug);
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

  const toggleAge = (slug: string) => {
    setDraftAges((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const onApply = () => {
    const params = new URLSearchParams();
    if (draftDiscipline) params.set("discipline", draftDiscipline);
    if (draftNbhds.size > 0) params.set("nbhd", Array.from(draftNbhds).join(","));
    if (draftAges.size > 0) params.set("age", Array.from(draftAges).join(","));
    if (draftFlags.online) params.set("online", "1");
    if (draftFlags.trial) params.set("trial", "1");
    if (draftFlags.featured) params.set("featured", "1");
    if (draftSort !== "newest") params.set("sort", draftSort);
    setOpen(false);
    router.push(`${baseHref}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const clearDrafts = () => {
    setDraftDiscipline(undefined);
    setDraftNbhds(new Set());
    setDraftAges(new Set());
    setDraftFlags({ online: false, trial: false, featured: false });
    setDraftSort("newest");
  };

  const sheetFooter = useMemo(
    () => (
      <div>
        <button type="button" className="btn btn-primary btn-block" onClick={onApply}>
          Apply (showing {total})
        </button>
        <button
          type="button"
          onClick={clearDrafts}
          className="mt-3 block w-full text-center text-xs font-semibold uppercase tracking-[1px]"
          style={{ color: "rgb(var(--magenta))" }}
        >
          Clear all
        </button>
      </div>
    ),
    [onApply, total],
  );

  return (
    <>
      <div className="md:hidden">
        <form onSubmit={onSubmitSearch} className="nav-search" role="search" aria-label="Search studios">
          <label className="search-wrap-mobile">
            <Search
              size={16}
              aria-hidden="true"
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgb(var(--subtle))" }}
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
            className="icon-btn"
            aria-label="Open filters"
            onClick={() => setOpen(true)}
            style={{
              background: "rgb(var(--magenta))",
              color: "rgb(var(--cream))",
              borderColor: "rgb(var(--magenta))",
              fontWeight: 700,
            }}
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
              <span className="x" aria-hidden="true">
                <X size={12} />
              </span>
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
                  className={`pill${isActive ? " active" : ""}`}
                  onClick={() => setDraftDiscipline(isActive ? undefined : d.slug)}
                  style={{ width: "100%", padding: "9px 6px", fontSize: 12, minHeight: 38 }}
                >
                  {d.display_name}
                </button>
              );
            })}
          </div>

          <SheetGroup title="Age group">
            <div className="grid grid-cols-2 gap-1.5">
              {AGE_GROUPS.map((a) => {
                const checked = draftAges.has(a.slug);
                return (
                  <button
                    key={a.slug}
                    type="button"
                    onClick={() => toggleAge(a.slug)}
                    className={`pill${checked ? " active" : ""}`}
                    style={{ width: "100%", padding: "9px 8px", fontSize: 12 }}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </SheetGroup>

          <SheetGroup title="Neighbourhood">
            {NEIGHBOURHOODS.map((n) => {
              const checked = draftNbhds.has(n.slug);
              return (
                <label
                  key={n.slug}
                  className="flex items-center justify-between border-b py-3 last:border-b-0"
                  style={{ borderColor: "var(--line)" }}
                >
                  <span className="text-sm font-medium" style={{ color: "rgb(var(--ink))" }}>
                    {n.label}{" "}
                    <span style={{ color: "rgb(var(--subtle))", fontSize: 11.5, fontWeight: 500 }}>{n.count}</span>
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
            <ToggleRow label="Online classes" checked={draftFlags.online} onChange={(v) => setDraftFlags((f) => ({ ...f, online: v }))} />
            <ToggleRow label="Free trial" checked={draftFlags.trial} onChange={(v) => setDraftFlags((f) => ({ ...f, trial: v }))} />
            <ToggleRow label="Featured first" checked={draftFlags.featured} onChange={(v) => setDraftFlags((f) => ({ ...f, featured: v }))} />
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
                    className={`pill${isActive ? " active" : ""}`}
                    style={{ width: "100%", padding: "9px 8px", fontSize: 12 }}
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
      <span className="text-sm font-medium" style={{ color: "rgb(var(--ink))" }}>
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
