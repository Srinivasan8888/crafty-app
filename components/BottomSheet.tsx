"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showHandle?: boolean;
};

export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  showHandle = true,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  // Focus trap: trap Tab / Shift+Tab inside the dialog while open;
  // restore focus to the previously-focused element on close.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Initial focus on first focusable when sheet opens.
    const initialFocusables = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    initialFocusables[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      // Re-query on every Tab so the trap stays correct when children change
      // (e.g. filters expand/collapse, async content loads).
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open || !mounted) return null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const node = (
    <div
      className="sheet-backdrop sheet-backdrop-anim"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={`sheet sheet-anim flex flex-col${showHandle ? "" : " no-handle"}`}
        onClick={stop}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {(title || subtitle) && (
          <div className="shrink-0">
            {title && <h3 className="serif font-bold">{title}</h3>}
            {subtitle && <p className="muted text-sm">{subtitle}</p>}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div
            className="sticky bottom-0 -mx-5 px-5 pt-3 pb-1 mt-3"
            style={{
              background: "rgb(var(--cream))",
              borderTop: "1px solid var(--line)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

export default BottomSheet;
