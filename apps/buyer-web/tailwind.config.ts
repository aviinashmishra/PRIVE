import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // green & white luxury palette — emerald spine, forest depths, champagne whisper.
        // Semantic tokens are CSS variables (globals.css) so the whole app re-skins
        // between light and dark; brand hues 300–950 read well on both and stay fixed.
        brand: {
          50: "rgb(var(--c-brand-50) / <alpha-value>)",
          100: "rgb(var(--c-brand-100) / <alpha-value>)",
          200: "rgb(var(--c-brand-200) / <alpha-value>)",
          300: "#6FC7A0",
          400: "#39AC7C",
          500: "#128F62",
          600: "#0E7C55",
          700: "rgb(var(--c-brand-700) / <alpha-value>)",
          800: "#0A4E37",
          900: "#08402E",
          950: "#04241A",
        },
        forest: "#05271C",
        canvas: "rgb(var(--c-canvas) / <alpha-value>)",
        paper: "rgb(var(--c-paper) / <alpha-value>)",
        mist: "rgb(var(--c-mist) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        "line-strong": "rgb(var(--c-line-strong) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        "ink-soft": "rgb(var(--c-ink-soft) / <alpha-value>)",
        "ink-faint": "rgb(var(--c-ink-faint) / <alpha-value>)",
        gold: "#B8934F",
        "gold-soft": "#D8BE8A",
        up: "#0E9E68",
        down: "#D2564B",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(5,39,28,.04), 0 8px 24px -12px rgba(5,39,28,.12)",
        lift: "0 2px 4px rgba(5,39,28,.05), 0 18px 40px -16px rgba(5,39,28,.18)",
        glow: "0 0 0 1px rgba(14,124,85,.12), 0 12px 32px -10px rgba(14,124,85,.35)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
        "3xl": "26px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "flash-up": { "0%": { backgroundColor: "rgba(14,158,104,.16)" }, "100%": { backgroundColor: "transparent" } },
        "flash-down": { "0%": { backgroundColor: "rgba(210,86,75,.16)" }, "100%": { backgroundColor: "transparent" } },
      },
      animation: {
        "fade-up": "fade-up .6s cubic-bezier(.2,.7,.2,1) both",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        "flash-up": "flash-up .6s ease-out",
        "flash-down": "flash-down .6s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
