import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — deep green (trust, Pakistan national color) + warm gold
        brand: {
          DEFAULT: "#0B6E4F",
          dark: "#074F38",
          light: "#10B981",
        },
        gold: {
          DEFAULT: "#D4A843",
          light: "#F5E6B8",
        },
        danger: {
          DEFAULT: "#DC2626",
          light: "#FEE2E2",
        },
      },
      fontFamily: {
        // Noto Nastaliq for Urdu body text; system sans for English
        urdu: ["'Noto Nastaliq Urdu'", "'Jameh Nastaliq'", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
