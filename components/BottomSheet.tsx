"use client";

import { useEffect, useState } from "react";
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

  if (!open || !mounted) return null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const node = (
    <div
      className="sheet-backdrop sheet-backdrop-anim"
      onClick={onClose}
      role="presentation"
    >
      <div
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
