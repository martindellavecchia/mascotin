import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0d9488",
          foreground: "#ffffff",
          hover: "#0f766e",
          soft: "#ccfbf1",
        },
        secondary: {
          DEFAULT: "#f1f5f9",
          foreground: "#0f172a",
        },
        accent: {
          DEFAULT: "#f97316",
          foreground: "#ffffff",
          hover: "#ea580c",
        },
        background: "#f8fafc",
        "background-dark": "#0f172a",
        surface: "#ffffff",
        "surface-dark": "#1e293b",
        "text-main": "#0f172a",
        "text-secondary": "#334155",
        "text-muted": "#64748b",
        border: "#e2e8f0",
        "border-dark": "#334155",
        input: "#ffffff",
        ring: "#0d9488",
        destructive: {
          DEFAULT: "#dc2626",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "#16a34a",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#ca8a04",
          foreground: "#ffffff",
        },
        info: {
          DEFAULT: "#3b82f6",
          foreground: "#ffffff",
        },
      },
      fontFamily: {
        display: ["var(--font-plus-jakarta-sans)", "Plus Jakarta Sans", "sans-serif"],
        sans: ["var(--font-plus-jakarta-sans)", "Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.75rem",
        sm: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.25rem",
        full: "9999px",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
