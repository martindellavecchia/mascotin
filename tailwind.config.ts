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
    				DEFAULT: "#13ec80",
    				foreground: "#064e3b"
    			},
    			secondary: "#e8f5e0",
    			accent: "#4cc9f1",
    			background: "#f8fcfa",
    			"background-dark": "#102219",
    			surface: "#ffffff",
    			"surface-dark": "#162e22",
    			"text-main": "#0d1b14",
    			"text-secondary": "#4c9a73",
    			"text-muted": "#6b8e7a",
    			border: "#cfe7db",
    			"border-dark": "#2a4a3b",
    			input: "#ffffff",
    			ring: "#13ec80",
    			destructive: {
    				DEFAULT: "#ef4444",
    				foreground: "#7f1d1d"
    			},
    			success: {
    				DEFAULT: "#10b981",
    				foreground: "#064e3b"
    			},
    			warning: {
    				DEFAULT: "#f59e0b",
    				foreground: "#78350f"
    			},
    			info: {
    				DEFAULT: "#3b82f6",
    				foreground: "#1e3a8a"
    			},
    		},
   		fontFamily: {
   			"display": ["Plus Jakarta Sans", "Noto Sans", "sans-serif"]
   		},
   		borderRadius: {
   			"DEFAULT": "1rem",
   			"lg": "2rem",
   			"xl": "3rem",
   			"full": "9999px"
   		}
   	}
   },
  plugins: [tailwindcssAnimate],
};
export default config;
