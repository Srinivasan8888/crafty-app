import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "1.25rem", screens: { "2xl": "1200px" } },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        cream: {
          DEFAULT: "rgb(var(--cream) / <alpha-value>)",
          2: "rgb(var(--cream-2) / <alpha-value>)",
          3: "rgb(var(--cream-3) / <alpha-value>)",
        },
        mustard: {
          DEFAULT: "rgb(var(--mustard) / <alpha-value>)",
          dark: "rgb(var(--mustard-dark) / <alpha-value>)",
        },
        magenta: {
          DEFAULT: "rgb(var(--magenta) / <alpha-value>)",
          dark: "rgb(var(--magenta-dark) / <alpha-value>)",
        },
        forest: {
          DEFAULT: "rgb(var(--forest) / <alpha-value>)",
          dark: "rgb(var(--forest-dark) / <alpha-value>)",
        },
        indigo: "rgb(var(--indigo) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          muted: "rgb(var(--muted) / <alpha-value>)",
          subtle: "rgb(var(--subtle) / <alpha-value>)",
        },
        muted: "rgb(var(--muted) / <alpha-value>)",
        subtle: "rgb(var(--subtle) / <alpha-value>)",
        line: {
          DEFAULT: "rgba(31, 95, 60, 0.18)",
          strong: "rgba(31, 95, 60, 0.30)",
        },
        success: "rgb(var(--forest) / <alpha-value>)",
        warn: "rgb(var(--mustard) / <alpha-value>)",
        danger: "rgb(var(--magenta) / <alpha-value>)",

        canvas: {
          DEFAULT: "rgb(var(--cream) / <alpha-value>)",
          raised: "rgb(var(--cream) / <alpha-value>)",
          sunken: "rgb(var(--cream-2) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--magenta) / <alpha-value>)",
          fg: "rgb(var(--cream) / <alpha-value>)",
          soft: "rgb(var(--cream-2) / <alpha-value>)",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        soft: "0 4px 12px rgba(180, 80, 40, 0.10)",
        "soft-lg": "0 8px 24px rgba(180, 80, 40, 0.14)",
        card: "0 4px 12px rgba(180, 80, 40, 0.10)",
        pop: "0 8px 24px rgba(180, 80, 40, 0.14)",
      },
    },
  },
  plugins: [],
};
export default config;
