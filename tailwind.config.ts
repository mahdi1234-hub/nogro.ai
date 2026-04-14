import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#f0f7f0",
          100: "#d4e8d4",
          200: "#a8d1a8",
          300: "#7cba7c",
          400: "#4fa34f",
          500: "#3d7a35",
          600: "#2d5a27",
          700: "#1e3d1a",
          800: "#1a2e1a",
          900: "#0d1f0d",
          950: "#061206",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
