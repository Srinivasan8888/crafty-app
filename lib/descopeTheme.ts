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
    primary: { main: "#B5365B", dark: "#8E2A48", light: "#E0809C", contrast: "#FFFFFF" },
    background: { default: "#FFF6E5", paper: "#FFFFFF" },
    text: { primary: "#1A1A1A", secondary: "#6B5A3E" },
  },
  dark: {
    primary: { main: "#B5365B", dark: "#8E2A48", light: "#E0809C", contrast: "#FFFFFF" },
    background: { default: "#161616", paper: "#1E1E1E" },
    text: { primary: "#F5F0DC", secondary: "#B2AEA7" },
  },
} as const;
