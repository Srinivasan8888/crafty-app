"use client";

// DEV-ONLY visual comment tool. Renders nothing in production (and the layout
// only mounts it when NODE_ENV !== "production"). Lets you toggle "Comment
// mode", hover to highlight any element, click to select it, and type what you
// want changed. Each comment is POSTed to /api/_design-comments which appends
// it to .design-comments.jsonl at the repo root — Claude reads that file and
// makes the edits. This is scaffolding for the design loop, not shipped UI.

import { useCallback, useEffect, useRef, useState } from "react";

const OVERLAY_ATTR = "data-design-overlay";

type Selected = {
  selector: string;
  tag: string;
  id: string;
  classes: string;
  text: string;
  rect: { top: number; left: number; width: number; height: number };
};

// Build a readable-enough CSS path: tag#id.classes:nth-of-type, walking up to
// body. Good enough for Claude to locate the element in source — the class
// list usually maps straight to the component (e.g. `.hero`, `.ctas`).
function cssPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === 1 && node.tagName.toLowerCase() !== "body") {
    let part = node.tagName.toLowerCase();
    if (node.id) {
      part += `#${node.id}`;
      parts.unshift(part);
      break; // an id is unique enough to stop here
    }
    const cls = Array.from(node.classList)
      .filter((c) => !c.startsWith("__") && c !== "")
      .slice(0, 4)
      .map((c) => `.${CSS.escape(c)}`)
      .join("");
    part += cls;
    const parent = node.parentElement;
    if (parent) {
      const sameTag = Array.from(parent.children).filter(
        (c) => c.tagName === node!.tagName,
      );
      if (sameTag.length > 1) {
        part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
      }
    }
    parts.unshift(part);
    node = node.parentElement;
  }
  return parts.join(" > ");
}

function describe(el: Element): Selected {
  const r = el.getBoundingClientRect();
  return {
    selector: cssPath(el),
    tag: el.tagName.toLowerCase(),
    id: el.id || "",
    classes: Array.from(el.classList).join(" "),
    text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
    rect: { top: r.top, left: r.left, width: r.width, height: r.height },
  };
}

function isOwnUi(el: Element | null): boolean {
  return !!el?.closest(`[${OVERLAY_ATTR}]`);
}

export function DesignCommentOverlay() {
  const [active, setActive] = useState(false);
  const [hover, setHover] = useState<DOMRect | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [comment, setComment] = useState("");
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Hover highlight follows the element under the cursor.
  useEffect(() => {
    if (!active || selected) {
      setHover(null);
      return;
    }
    const onMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || isOwnUi(el)) {
        setHover(null);
        return;
      }
      setHover(el.getBoundingClientRect());
    };
    window.addEventListener("mousemove", onMove, true);
    return () => window.removeEventListener("mousemove", onMove, true);
  }, [active, selected]);

  // Capture-phase click: select the element, swallow the click so links/buttons
  // don't fire while in comment mode.
  useEffect(() => {
    if (!active) return;
    const onClick = (e: MouseEvent) => {
      const el = e.target as Element | null;
      if (isOwnUi(el)) return; // let our own buttons work
      e.preventDefault();
      e.stopPropagation();
      const real = document.elementFromPoint(e.clientX, e.clientY);
      if (real && !isOwnUi(real)) {
        setSelected(describe(real));
        setComment("");
      }
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [active]);

  useEffect(() => {
    if (selected) inputRef.current?.focus();
  }, [selected]);

  // Esc cancels the current selection, or exits comment mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selected) setSelected(null);
      else if (active) setActive(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [active, selected]);

  const submit = useCallback(async () => {
    if (!selected || !comment.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/design-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selected,
          comment: comment.trim(),
          url: window.location.pathname + window.location.search,
          viewport: { w: window.innerWidth, h: window.innerHeight },
          ts: new Date().toISOString(),
        }),
      });
      setCount((c) => c + 1);
    } catch {
      // best-effort; the dev server may have restarted
    } finally {
      setSaving(false);
      setSelected(null);
      setComment("");
    }
  }, [selected, comment]);

  // Position the comment box near the selected element, clamped on-screen.
  const boxTop = selected
    ? Math.min(selected.rect.top + selected.rect.height + 8, window.innerHeight - 220)
    : 0;
  const boxLeft = selected
    ? Math.min(Math.max(selected.rect.left, 8), window.innerWidth - 340)
    : 0;

  return (
    <div {...{ [OVERLAY_ATTR]: "" }}>
      {/* Toggle button */}
      <button
        onClick={() => {
          setActive((a) => !a);
          setSelected(null);
        }}
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 2147483646,
          padding: "10px 16px",
          borderRadius: 999,
          border: "none",
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(0,0,0,.25)",
          background: active ? "#B5365B" : "#1a1a1a",
          color: "#fff",
        }}
      >
        {active ? "✕ Exit comment mode" : "💬 Comment"}
        {count > 0 && (
          <span
            style={{
              marginLeft: 8,
              background: "#fff",
              color: "#B5365B",
              borderRadius: 999,
              padding: "1px 7px",
              fontSize: 11,
            }}
          >
            {count}
          </span>
        )}
      </button>

      {/* Mode hint */}
      {active && !selected && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: 16,
            transform: "translateX(-50%)",
            zIndex: 2147483646,
            background: "#1a1a1a",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: 8,
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
            boxShadow: "0 4px 14px rgba(0,0,0,.25)",
          }}
        >
          Click any element to comment on it · Esc to exit
        </div>
      )}

      {/* Hover highlight */}
      {active && hover && !selected && (
        <div
          style={{
            position: "fixed",
            top: hover.top,
            left: hover.left,
            width: hover.width,
            height: hover.height,
            zIndex: 2147483645,
            pointerEvents: "none",
            border: "2px solid #B5365B",
            background: "rgba(181,54,91,.10)",
            borderRadius: 4,
          }}
        />
      )}

      {/* Selected highlight */}
      {selected && (
        <div
          style={{
            position: "fixed",
            top: selected.rect.top,
            left: selected.rect.left,
            width: selected.rect.width,
            height: selected.rect.height,
            zIndex: 2147483645,
            pointerEvents: "none",
            border: "2px solid #B5365B",
            background: "rgba(181,54,91,.12)",
            borderRadius: 4,
          }}
        />
      )}

      {/* Comment box */}
      {selected && (
        <div
          style={{
            position: "fixed",
            top: boxTop,
            left: boxLeft,
            zIndex: 2147483646,
            width: 330,
            background: "#fff",
            color: "#1a1a1a",
            borderRadius: 10,
            boxShadow: "0 8px 30px rgba(0,0,0,.3)",
            fontFamily: "system-ui, sans-serif",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              background: "#faf6ef",
              borderBottom: "1px solid #eee",
              fontSize: 11,
              color: "#666",
              wordBreak: "break-all",
            }}
          >
            <strong style={{ color: "#B5365B" }}>{selected.tag}</strong>
            {selected.classes ? ` .${selected.classes.split(" ").slice(0, 3).join(".")}` : ""}
            {selected.text ? (
              <div style={{ marginTop: 2, fontStyle: "italic" }}>
                “{selected.text.slice(0, 60)}
                {selected.text.length > 60 ? "…" : ""}”
              </div>
            ) : null}
          </div>
          <textarea
            ref={inputRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
            }}
            placeholder="What should change here? (e.g. make this smaller, move it right, change color to red)"
            rows={3}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              resize: "vertical",
              padding: "10px 12px",
              fontSize: 13,
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              padding: "8px 12px",
              borderTop: "1px solid #eee",
            }}
          >
            <button
              onClick={() => setSelected(null)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #ddd",
                background: "#fff",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!comment.trim() || saving}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
                background: comment.trim() ? "#B5365B" : "#ccc",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: comment.trim() ? "pointer" : "default",
              }}
            >
              {saving ? "Saving…" : "Save comment (⌘↵)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
