"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

type EntityType = "crafter" | "store" | "studio" | "event";

type SaveButtonProps = {
  entityType: EntityType;
  entityId: string;
  initialSaved?: boolean;
  variant?: "icon" | "button";
  className?: string;
  style?: React.CSSProperties;
};

const TYPE_TO_API: Record<EntityType, "CRAFTER" | "STORE" | "STUDIO" | "EVENT"> = {
  crafter: "CRAFTER",
  store: "STORE",
  studio: "STUDIO",
  event: "EVENT",
};

export function SaveButton({
  entityType,
  entityId,
  initialSaved = false,
  variant = "icon",
  className,
  style,
}: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    const next = !saved;
    setSaved(next); // optimistic
    setPending(true);
    try {
      const res = await fetch("/api/saves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: TYPE_TO_API[entityType],
          entity_id: entityId,
        }),
      });
      if (!res.ok) {
        // rollback on failure
        setSaved(!next);
      } else {
        const data = await res.json().catch(() => null);
        if (data && typeof data.saved === "boolean") {
          setSaved(data.saved);
        }
      }
    } catch {
      setSaved(!next);
    } finally {
      setPending(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={saved ? "Remove from saved" : "Save"}
        aria-pressed={saved}
        className={className ?? "heart"}
        disabled={pending}
        style={{ cursor: "pointer", border: "none", ...style }}
      >
        <Heart
          size={16}
          aria-hidden="true"
          fill={saved ? "currentColor" : "none"}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      disabled={pending}
      className={className ?? "btn btn-ghost"}
      style={style}
    >
      <Heart
        size={16}
        aria-hidden="true"
        fill={saved ? "currentColor" : "none"}
      />
      {saved ? "Saved" : "Save"}
    </button>
  );
}

export default SaveButton;
