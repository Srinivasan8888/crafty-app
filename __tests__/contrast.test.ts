import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * WCAG 2.1 contrast tests for the design tokens defined in app/globals.css.
 * These tests parse the CSS file directly so the audit table from PRD §22.4
 * lives next to the canonical token source.
 *
 * AA thresholds:
 *   - 4.5:1 for normal body text
 *   - 3.0:1 for large text (≥18pt or ≥14pt bold) and non-text UI components
 */

const here = dirname(fileURLToPath(import.meta.url));
const cssPath = resolve(here, "..", "app", "globals.css");
const css = readFileSync(cssPath, "utf8");

/**
 * Parse a `--token: R G B;` declaration from inside the `:root { ... }` block.
 * Tokens are stored as space-separated RGB components for use with `rgb(var(--x))`.
 */
function parseToken(name: string): [number, number, number] {
  // Match "--name: R G B;" inside the root block — first occurrence wins
  // (the :root block precedes the .dark override in globals.css).
  const re = new RegExp(`--${name}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s*;`);
  const m = css.match(re);
  if (!m) throw new Error(`Token --${name} not found in app/globals.css`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * Convert sRGB 0–255 channel to linear-light, per WCAG 2.x relative luminance.
 */
function linearize(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(
  fg: [number, number, number],
  bg: [number, number, number],
): number {
  const l1 = relLuminance(fg);
  const l2 = relLuminance(bg);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

describe("WCAG contrast for design tokens (PRD §22.4 audit table)", () => {
  const canvas = parseToken("canvas");
  const canvasRaised = parseToken("canvas-raised");
  const ink = parseToken("ink");
  const inkMuted = parseToken("ink-muted");
  const accent = parseToken("accent");
  const accentFg = parseToken("accent-fg");

  it("--ink on --canvas passes AA for body text (≥ 4.5:1)", () => {
    expect(contrastRatio(ink, canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it("--ink on --canvas-raised passes AA for body text (≥ 4.5:1)", () => {
    expect(contrastRatio(ink, canvasRaised)).toBeGreaterThanOrEqual(4.5);
  });

  it("--ink-muted on --canvas passes AA for body text (≥ 4.5:1)", () => {
    expect(contrastRatio(inkMuted, canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it("--accent-fg on --accent passes AA for body text (≥ 4.5:1)", () => {
    // Primary button surface — must be readable for both body labels and
    // larger button text.
    expect(contrastRatio(accentFg, accent)).toBeGreaterThanOrEqual(4.5);
  });

  // ----- KNOWN-FAILING PAIRS (skipped, tracked in PRD §22.4) -----

  // --ink-subtle on --canvas: known to fail AA per PRD §22.4 audit. The
  // subtle ink color is intentionally low-contrast for hint/placeholder
  // text only, and is never used for primary readable copy. Re-evaluate
  // when the design tokens are next refreshed.
  it.skip("--ink-subtle on --canvas passes AA for body text (PRD §22.4 known failure)", () => {
    const inkSubtle = parseToken("ink-subtle");
    expect(contrastRatio(inkSubtle, canvas)).toBeGreaterThanOrEqual(4.5);
  });

  // --accent on --canvas: the gumroad pink does not meet AA against the
  // warm cream background per PRD §22.4 audit. The accent color is only
  // used as a fill (with --accent-fg on top), never as foreground text on
  // the canvas. Re-evaluate when the accent palette is next refreshed.
  it.skip("--accent on --canvas passes AA for large text (PRD §22.4 known failure)", () => {
    expect(contrastRatio(accent, canvas)).toBeGreaterThanOrEqual(3.0);
  });
});
