import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-syne)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      colors: {
        bg: {
          0: "#0e0f11",
          1: "#13141a",
          2: "#1a1b23",
          3: "#21222d",
          4: "#282935",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.07)",
          2: "rgba(255,255,255,0.12)",
        },
        text: {
          DEFAULT: "#e8e9f0",
          2: "#9b9cac",
          3: "#5a5b6a",
        },
        purple: {
          DEFAULT: "#7c6ef5",
          dim: "#4a3fa0",
          glow: "rgba(124,110,245,0.15)",
        },
        accent: {
          blue: "#5badee",
          green: "#4eca9a",
          amber: "#e8a83a",
          red: "#e85a5a",
          teal: "#38c4c4",
        },
      },
    },
  },
  plugins: [],
};

export default config;
