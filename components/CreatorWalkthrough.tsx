"use client";

// V1.5 — first-time creator tooltip walkthrough.
//
// Lightweight DIY tour (no external lib): a single floating tooltip that
// follows a sequence of selectors. Avoids pulling in driver.js / Shepherd.js
// which add 20-40KB for what's a four-step hint. localStorage flag prevents
// re-show.

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const COMPLETED_KEY = "crafty_walkthrough_done";

type Step = {
  selector: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
};

const STEPS: Step[] = [
  {
    selector: '[data-tour="dashboard-create"], a[href$="/dashboard/crafter/new"]',
    title: "Start with your crafter profile",
    body: "Five minutes to publish — name, photos, a way to be reached. You can edit anytime.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="sidebar-saved"], a[href="/dashboard/saved"]',
    title: "Saved list",
    body: "Hearts on any card go here. Useful for tracking what you've shortlisted as a buyer too.",
    placement: "right",
  },
  {
    selector: '[data-tour="sidebar-events"], a[href="/dashboard/events"]',
    title: "Events tab",
    body: "Once you've got a listing, you can host workshops & meetups linked to it.",
    placement: "right",
  },
];

export function CreatorWalkthrough() {
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(COMPLETED_KEY)) return;
    // Defer to next tick so the page has mounted.
    setTimeout(() => setStepIndex(0), 300);
  }, []);

  useEffect(() => {
    if (stepIndex == null) return;
    const step = STEPS[stepIndex];
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      // Selector not on page; skip to next or dismiss.
      if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
      else dismiss();
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [stepIndex]);

  function next() {
    if (stepIndex == null) return;
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
    else dismiss();
  }

  function dismiss() {
    try { localStorage.setItem(COMPLETED_KEY, "1"); } catch {}
    setStepIndex(null);
  }

  if (stepIndex == null || !rect) return null;

  const step = STEPS[stepIndex];
  const tipStyle: React.CSSProperties = {
    position: "fixed",
    top: rect.bottom + 8,
    left: Math.max(8, Math.min(window.innerWidth - 340, rect.left)),
    zIndex: 50,
    maxWidth: 320,
  };
  const haloStyle: React.CSSProperties = {
    position: "fixed",
    top: rect.top - 4,
    left: rect.left - 4,
    width: rect.width + 8,
    height: rect.height + 8,
    border: "2px solid rgb(var(--accent))",
    borderRadius: 12,
    pointerEvents: "none",
    zIndex: 49,
    boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
  };

  return (
    <>
      <div style={haloStyle} aria-hidden />
      <div ref={tipRef} role="dialog" aria-labelledby="tour-title" style={tipStyle} className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <p id="tour-title" className="font-semibold text-ink">{step.title}</p>
          <button type="button" onClick={dismiss} className="icon-btn" aria-label="Skip tour">
            <X size={14} />
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-ink-subtle">{stepIndex + 1} of {STEPS.length}</p>
          <button type="button" onClick={next} className="btn btn-primary btn-sm">
            {stepIndex < STEPS.length - 1 ? "Next" : "Got it"}
          </button>
        </div>
      </div>
    </>
  );
}
