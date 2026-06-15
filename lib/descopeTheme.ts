// Crafty brand colour intent for the Descope auth widget.
//
// IMPORTANT (verified at runtime 2026-06): this object is NOT currently applied
// by the Descope <Descope themeOverride=...> web component. The component expects
// a Descope-shaped override ({ light: { global: {...}, components: {...} }, dark: {...} })
// and ignores this MUI-style { primary, background, text } shape, so the rendered
// flow still uses the project's default (unbranded) theme — a white card with a
// blue primary button. The actual fix lives in the Descope console Flow Editor
// (Styles), or in rebuilding this override against Descope's real token schema.
// Keep the intended values here as a reference until that branding is done.
//
// PRD §17.6 token mirror (sRGB hex):
//   --magenta: #B5365B   (Crafty primary accent)
//   --cream:   #FFF6E5   (canvas background)
//   --ink:     #1A1A1A   (primary text)

export const craftyDescopeTheme = {
  light: {
    primary: { main: "#B5365B", dark: "#8E2A48", light: "#E0809C", contrast: "#FFF6E5" },
    // Cream-Not-White Rule (DESIGN.md §2): the form card surface ("paper") must
    // never be pure #FFFFFF. We use the cream tint (#FBEBC8) so the widget card
    // separates subtly from the khadi-cream page (#FFF6E5) without going white.
    background: { default: "#FFF6E5", paper: "#FBEBC8" },
    text: { primary: "#1A1A1A", secondary: "#6B5A3E" },
  },
  dark: {
    primary: { main: "#B5365B", dark: "#8E2A48", light: "#E0809C", contrast: "#FFF6E5" },
    background: { default: "#161616", paper: "#1E1E1E" },
    text: { primary: "#F5F0DC", secondary: "#B2AEA7" },
  },
} as const;
