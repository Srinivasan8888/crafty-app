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
 *
 * Token naming follows what's actually in app/globals.css (cream / ink /
 * muted / subtle / magenta) rather than the PRD's abstract canvas / accent
 * names. PRD §17.6 is the source of truth for the values.
 */

const here = dirname(fileURLToPath(import.meta.url));
const cssPath = resolve(here, "..", "app", "globals.css");
const css = readFileSync(cssPath, "utf8");

function parseToken(name: string): [number, number, number] {
  // First occurrence wins — the :root block (light mode) precedes the .dark override.
  const re = new RegExp(`--${name}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s*;`);
  const m = css.match(re);
  if (!m) throw new Error(`Token --${name} not found in app/globals.css`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

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
  const cream = parseToken("cream");        // page background (canvas)
  const cream2 = parseToken("cream-2");     // card surface (canvas-raised)
  const ink = parseToken("ink");            // primary text
  const muted = parseToken("muted");        // secondary text (ink-muted equivalent)
  const subtle = parseToken("subtle");      // tertiary text (ink-subtle equivalent)
  const magenta = parseToken("magenta");    // accent (used for primary CTA + featured badge)
  const forest = parseToken("forest");      // success / eyebrows

  it("--ink on --cream passes AA for body text (≥ 4.5:1)", () => {
    expect(contrastRatio(ink, cream)).toBeGreaterThanOrEqual(4.5);
  });

  it("--ink on --cream-2 (card surface) passes AA for body text (≥ 4.5:1)", () => {
    expect(contrastRatio(ink, cream2)).toBeGreaterThanOrEqual(4.5);
  });

  it("--muted on --cream passes AA for body text (≥ 4.5:1)", () => {
    expect(contrastRatio(muted, cream)).toBeGreaterThanOrEqual(4.5);
  });

  it("--forest on --cream passes AA for body text (≥ 4.5:1)", () => {
    // Forest is used for eyebrow labels and link decorations; treat as body.
    expect(contrastRatio(forest, cream)).toBeGreaterThanOrEqual(4.5);
  });

  it("--cream on --magenta (primary button label) passes AA for body text (≥ 4.5:1)", () => {
    // Button labels are cream-on-magenta. Verify the inverse pair works.
    expect(contrastRatio(cream, magenta)).toBeGreaterThanOrEqual(4.5);
  });

  // ───── KNOWN-BORDERLINE PAIRS (allowed at AA-large = 3:1) ─────

  it("--subtle on --cream meets 3:1 (large-text / caption AA-large)", () => {
    // PRD §22.4 accepts this at 3:1 because it's only used for tertiary
    // captions and disabled-state UI, never primary body copy.
    expect(contrastRatio(subtle, cream)).toBeGreaterThanOrEqual(3.0);
  });
});
