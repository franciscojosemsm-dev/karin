import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta pastel: calma y profesionalismo
        bruma: "#F7F5F2", // fondo general
        salvia: { 50: "#F1F6F3", 100: "#E1ECE5", 200: "#C5DAD0", 400: "#8DB3A0", 600: "#5C8672", 700: "#496C5B" },
        lavanda: { 50: "#F5F3FA", 100: "#EAE6F4", 200: "#D6CFEA", 400: "#A89BD0", 600: "#7A6BAE" },
        arena: { 50: "#FBF8F3", 100: "#F3ECE0", 200: "#E8DCC6" },
        tinta: { DEFAULT: "#2F3A40", suave: "#5E6B72", tenue: "#8A969C" },
        riesgo: { 50: "#FDF0F0", 100: "#FADCDC", 500: "#D9534F", 600: "#C0392B", 700: "#A32D22" },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
      boxShadow: { suave: "0 1px 2px rgba(47,58,64,.04), 0 4px 16px rgba(47,58,64,.05)" },
    },
  },
  plugins: [],
};

export default config;
