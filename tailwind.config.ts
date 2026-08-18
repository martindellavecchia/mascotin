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
          DEFAULT: "#4b244a",
          foreground: "#ffffff",
          hover: "#3d1d3c",
          soft: "#f0eaf3",
        },
        secondary: {
          DEFAULT: "#f0eaf3",
          foreground: "#4b244a",
        },
        accent: {
          DEFAULT: "#b8d35a",
          foreground: "#271e27",
          hover: "#a8c649",
        },
        background: "#fff8ef",
        "background-dark": "#fff8ef",
        surface: "#ffffff",
        "surface-dark": "#ffffff",
        "text-main": "#271e27",
        "text-secondary": "#574b56",
        "text-muted": "#6a5d69",
        border: "#dccfd8",
        "border-dark": "#dccfd8",
        input: "#ffffff",
        ring: "#6d3a67",
        destructive: {
          DEFAULT: "#b5413a",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "#2f7d61",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#8a4d0f",
          foreground: "#ffffff",
        },
        info: {
          DEFAULT: "#4f5d95",
          foreground: "#ffffff",
        },
      },
      fontFamily: {
        display: ["var(--font-plus-jakarta-sans)", "Plus Jakarta Sans", "sans-serif"],
        sans: ["var(--font-plus-jakarta-sans)", "Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.625rem",
        sm: "0.375rem",
        md: "0.625rem",
        lg: "0.75rem",
        xl: "1rem",
        full: "9999px",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
