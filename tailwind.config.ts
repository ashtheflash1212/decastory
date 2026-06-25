import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "ink" and "parchment" are flipped from the old dark theme:
        // parchment is now the light paper-like background, ink is
        // the dark text drawn on top of it — same names, new roles.
        parchment: "#E8F2FA", // light, warm sky blue page background
        surface: "#FFFFFF", // card background
        surface2: "#D8E9F5", // hover / active background
        ink: "#27352E", // primary text — warm dark slate-green
        muted: "#6B7D72", // secondary text
        brass: "#D9C5A0", // warm cream accent — backgrounds/buttons only
        cocoa: "#6B4F33", // dark brown — for text/labels where cream lacks contrast
        rust: "#C1453D", // warm red accent (errors, "force" axis)
        steel: "#3F7EA6", // soft blue accent (secondary actions, "prudence" axis)
        mystic: "#8B6FB3", // violet accent — the genre-specific 4th karma axis
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mech: ["var(--font-mech)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
