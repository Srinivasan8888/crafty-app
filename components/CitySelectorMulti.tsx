"use client";

// V3 — multi-city selector for the search page.
//
// Popover with checkboxes. The URL's current city is always checked + locked;
// users add other cities on top of it. Submitting navigates to
// /${current}/search?q=…&cities=a,b,c — backwards-compatible with the single-
// city search (no cities= param ⇒ original behaviour).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";

type City = { slug: string; display_name: string };

type Props = {
  cities: City[];
  current: string;
  currentQuery: string;
  initiallySelected: string[];
};

export function CitySelectorMulti({
  cities,
  current,
  currentQuery,
  initiallySelected,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initiallySelected.length > 0 ? initiallySelected : [current]),
  );
  const popRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!popRef.current || !btnRef.current) return;
      const t = e.target as Node;
      if (popRef.current.contains(t) || btnRef.current.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(slug: string) {
    if (slug === current) return; // locked
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function apply() {
    const ordered = cities.filter((c) => selected.has(c.slug)).map((c) => c.slug);
    // If only the current city is checked, fall back to the simple single-city
    // URL (omit ?cities= so the page works in its legacy single-city path).
    const isJustCurrent = ordered.length === 1 && ordered[0] === current;
    const params = new URLSearchParams();
    if (currentQuery) params.set("q", currentQuery);
    if (!isJustCurrent) params.set("cities", ordered.join(","));
    const qs = params.toString();
    router.push(`/${current}/search${qs ? `?${qs}` : ""}`);
    setOpen(false);
  }

  const summary =
    selected.size <= 1
      ? cities.find((c) => c.slug === current)?.display_name ?? "Pick cities"
      : `${selected.size} cities`;

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2"
        style={{
          background: "rgb(var(--cream-2))",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--r-pill)",
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "var(--font-display)",
        }}
      >
        <span>Search across: {summary}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Select cities"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 40,
            minWidth: 240,
            background: "rgb(var(--cream))",
            border: "1px solid var(--line-strong)",
            borderRadius: 10,
            boxShadow: "0 8px 28px rgba(0,0,0,0.08)",
            padding: 10,
          }}
        >
          <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 260, overflowY: "auto" }}>
            {cities.map((c) => {
              const isLocked = c.slug === current;
              const isChecked = selected.has(c.slug);
              return (
                <li key={c.slug}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 8px",
                      borderRadius: 6,
                      cursor: isLocked ? "not-allowed" : "pointer",
                      opacity: isLocked ? 0.85 : 1,
                      fontSize: 14,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: "1.5px solid var(--line-strong)",
                        background: isChecked ? "rgb(var(--magenta))" : "rgb(var(--cream-2))",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                      }}
                    >
                      {isChecked && <Check size={12} />}
                    </span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isLocked}
                      onChange={() => toggle(c.slug)}
                      style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                      aria-label={c.display_name}
                    />
                    <span>{c.display_name}</span>
                    {isLocked && (
                      <span className="ml-auto text-xs text-muted italic">current</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
            <button type="button" onClick={apply} className="btn btn-primary btn-sm">
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
