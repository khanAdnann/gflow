import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "ui-sans-serif", "sans-serif"],
      },
      colors: {
        ink: { 950: "#03040a", 900: "#070a18", 800: "#0b1030", 700: "#121a45" },
        electric: { 400: "#4f9bff", 500: "#2f7bff", 600: "#1f5fe0" },
        violet: { 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed" },
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(79,155,255,0.55), 0 0 80px -20px rgba(139,92,246,0.5)",
      },
      keyframes: {
        spin360: { to: { transform: "rotate(360deg)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: { spin360: "spin360 6s linear infinite" },
    },
  },
  plugins: [],
} satisfies Config;

