"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { useSavedState } from "@/components/SavedStateProvider";

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
  const router = useRouter();
  const pathname = usePathname();
  const savedState = useSavedState();
  const key = `${TYPE_TO_API[entityType]}:${entityId}`;
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  // Hydrate from the shared saved set once it loads (and stay in sync if the
  // same entity is toggled from another card). Without this, hearts render
  // empty on revisit and re-tapping a saved item silently un-saves it.
  const ctxSaved = savedState?.loaded ? savedState.isSaved(key) : undefined;
  useEffect(() => {
    if (ctxSaved !== undefined) setSaved(ctxSaved);
  }, [ctxSaved]);

  async function toggle(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (pending) return;
    const next = !saved;
    setSaved(next); // optimistic
    savedState?.setSaved(key, next);
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
      if (res.status === 401) {
        // Signed-out buyer tapped Save — send them to sign in and bring them
        // back here, instead of silently flickering the heart back to empty.
        setSaved(!next);
        savedState?.setSaved(key, !next);
        router.push(`/sign-in?redirect_url=${encodeURIComponent(pathname || "/")}`);
      } else if (!res.ok) {
        // rollback on failure
        setSaved(!next);
        savedState?.setSaved(key, !next);
      } else {
        const data = await res.json().catch(() => null);
        if (data && typeof data.saved === "boolean") {
          setSaved(data.saved);
          savedState?.setSaved(key, data.saved);
        }
      }
    } catch {
      setSaved(!next);
      savedState?.setSaved(key, !next);
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
