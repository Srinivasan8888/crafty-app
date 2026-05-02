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
        className="sheet sheet-anim flex flex-col"
        onClick={stop}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={
          showHandle ? undefined : ({ ["--bs-handle-display" as string]: "none" } as React.CSSProperties)
        }
      >
        {!showHandle && (
          <style jsx>{`
            div.sheet::before {
              display: none;
            }
          `}</style>
        )}

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

        <style jsx>{`
          .sheet-anim {
            animation: bs-slide-up 200ms ease-out both;
          }
          @keyframes bs-slide-up {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
        `}</style>
        <style jsx global>{`
          .sheet-backdrop-anim {
            animation: bs-fade-in 200ms ease-out both;
          }
          @keyframes bs-fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

export default BottomSheet;
