"use client";

import { X } from "lucide-react";

export function DraftBanner({
  onRestore,
  onDismiss,
}: {
  onRestore: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-line-strong bg-canvas-sunken p-3 text-sm">
      <p className="text-ink">
        <strong>You have an unsaved draft.</strong> Want to pick up where you left off?
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-sm" onClick={onRestore}>
          Restore
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onDismiss}
          aria-label="Dismiss draft"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
