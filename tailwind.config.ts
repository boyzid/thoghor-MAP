import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#14232A",
        bgDeep: "#0E1A1F",
        panel: "#1D2F36",
        panel2: "#24383F",
        line: "rgba(237,230,214,0.10)",
        text: "#EDE6D6",
        textDim: "#9FB2AC",
        gold: "#C99A55",
        goldBright: "#E0B876",
        sage: "#7FA189",
        rust: "#B5573F",
        rustBright: "#D06C50",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
