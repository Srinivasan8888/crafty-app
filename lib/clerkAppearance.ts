import type { Appearance } from "@clerk/types";

/**
 * Crafty-branded Clerk appearance.
 *
 * Maps Clerk's auth UI to the Sunday-Bazaar palette (cream canvas, magenta
 * primary, ink text, soft shadow) and Crafty's typography pair (Fraunces for
 * headings, DM Sans for body). Uses the design tokens already wired in
 * app/globals.css so the form picks up light/dark theming automatically.
 */
export const craftyClerkAppearance: Appearance = {
  variables: {
    colorPrimary: "rgb(181, 54, 91)", // --magenta
    colorBackground: "rgb(255, 246, 229)", // --cream
    colorText: "rgb(26, 26, 26)", // --ink
    colorTextSecondary: "rgba(26, 26, 26, 0.65)",
    colorInputBackground: "rgb(255, 246, 229)",
    colorInputText: "rgb(26, 26, 26)",
    colorDanger: "rgb(181, 54, 91)",
    colorSuccess: "rgb(31, 95, 60)", // --forest
    colorWarning: "rgb(230, 168, 23)", // --mustard
    colorNeutral: "rgb(26, 26, 26)",
    fontFamily: "var(--font-body), 'DM Sans', system-ui, sans-serif",
    fontFamilyButtons: "var(--font-body), 'DM Sans', system-ui, sans-serif",
    borderRadius: "16px",
    spacingUnit: "1rem",
  },
  elements: {
    rootBox: {
      fontFamily: "var(--font-body), 'DM Sans', system-ui, sans-serif",
      color: "rgb(26, 26, 26)",
    },
    card: {
      backgroundColor: "rgb(255, 246, 229)",
      border: "1px solid rgba(31, 95, 60, 0.18)",
      borderRadius: "16px",
      boxShadow: "0 4px 12px rgba(180, 80, 40, 0.10)",
      padding: "32px",
    },
    headerTitle: {
      fontFamily: "var(--font-display), Fraunces, Georgia, serif",
      fontWeight: 700,
      fontSize: "26px",
      color: "rgb(26, 26, 26)",
    },
    headerSubtitle: {
      fontFamily: "var(--font-body), 'DM Sans', system-ui, sans-serif",
      color: "rgba(26, 26, 26, 0.65)",
      fontSize: "14px",
    },
    socialButtonsBlockButton: {
      borderRadius: "999px",
      border: "1.5px solid rgb(230, 168, 23)", // mustard outline
      backgroundColor: "rgb(255, 246, 229)",
      color: "rgb(31, 95, 60)", // forest
      fontWeight: 600,
      "&:hover": {
        backgroundColor: "rgb(251, 235, 200)", // --cream-2
      },
    },
    formFieldLabel: {
      color: "rgb(26, 26, 26)",
      fontWeight: 600,
      fontSize: "13px",
    },
    formFieldInput: {
      backgroundColor: "rgb(255, 246, 229)",
      border: "1px solid rgba(31, 95, 60, 0.30)",
      borderRadius: "10px",
      color: "rgb(26, 26, 26)",
      fontFamily: "var(--font-body), 'DM Sans', system-ui, sans-serif",
      "&:focus": {
        borderColor: "rgb(181, 54, 91)",
        boxShadow: "0 0 0 3px rgba(181, 54, 91, 0.15)",
      },
    },
    formButtonPrimary: {
      backgroundColor: "rgb(181, 54, 91)", // magenta
      color: "rgb(255, 246, 229)",
      borderRadius: "999px",
      fontWeight: 600,
      fontSize: "13.5px",
      padding: "12px 20px",
      boxShadow: "0 4px 12px rgba(180, 80, 40, 0.10)",
      textTransform: "none",
      "&:hover": {
        backgroundColor: "rgb(142, 42, 72)", // --magenta-dark
      },
      "&:focus": {
        backgroundColor: "rgb(142, 42, 72)",
        boxShadow: "0 0 0 3px rgba(181, 54, 91, 0.25)",
      },
    },
    footerActionLink: {
      color: "rgb(181, 54, 91)",
      fontWeight: 600,
      "&:hover": {
        color: "rgb(142, 42, 72)",
      },
    },
    identityPreviewEditButton: {
      color: "rgb(181, 54, 91)",
    },
    dividerLine: {
      backgroundColor: "rgba(31, 95, 60, 0.18)",
    },
    dividerText: {
      color: "rgba(26, 26, 26, 0.55)",
      fontFamily: "var(--font-body), 'DM Sans', system-ui, sans-serif",
    },
    formFieldAction: {
      color: "rgb(181, 54, 91)",
    },
  },
};

/**
 * Override Clerk's default copy so the dashboard's leftover "LP Intel" app name
 * is replaced with "Crafty" until the dashboard branding is updated. Only the
 * strings that surface the legacy name are overridden — everything else falls
 * back to Clerk's defaults.
 */
export const craftyClerkLocalization = {
  signIn: {
    start: {
      title: "Sign in to Crafty",
      subtitle: "Welcome back to India's craft community.",
    },
  },
  signUp: {
    start: {
      title: "Create your Crafty account",
      subtitle: "Join India's first city-localized craft community.",
    },
  },
  userButton: {
    action__manageAccount: "Manage Crafty account",
    action__signOut: "Sign out of Crafty",
  },
} as const;
