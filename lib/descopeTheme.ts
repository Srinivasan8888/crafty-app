// Descope component theme overrides. The majority of branding lives in the
// Descope dashboard's Flow Editor (Phase 0 founder work) — we only ship the
// primary-color values here so the default flows match Crafty's magenta /
// cream palette before any dashboard customization happens.
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
