import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",

  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        sidebar: "#0f172a",
        "sidebar-hover": "rgba(99,102,241,0.15)",
        brand: "#6366f1",
        "brand-light": "#818cf8",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        info: "#06b6d4",
      },

      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },

      animation: {
        "slide-in": "slideIn 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "pulse-dot": "pulseDot 1.4s ease-in-out infinite",
      },

      keyframes: {
        slideIn: {
          "0%": {
            transform: "translateY(8px)",
            opacity: "0",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
          },
        },

        fadeIn: {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },

        pulseDot: {
          "0%,80%,100%": {
            transform: "scale(0.6)",
            opacity: "0.4",
          },
          "40%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
      },
    },
  },

  plugins: [],
};

export default config;