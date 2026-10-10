import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563EB",
          light: "#3B82F6",
          dark: "#1D4ED8",
        },
        secondary: "#6366F1",
        dark: "#0B1220", // ink — slightly deeper than the brand-kit navy, used for admin shell + hero
        ink: {
          DEFAULT: "#0B1220",
          soft: "#475569",
        },
        mute: "#94A3B8",
        gray: {
          light: "#E7EBF1",
          bg: "#F6F8FB",
        },
        // Per-category accent tints — each top-level category gets its own
        // identity instead of every tile sharing the same primary blue.
        cat: {
          electronics: { DEFAULT: "#2563EB", tint: "#EFF4FF" },
          realestate: { DEFAULT: "#059669", tint: "#ECFDF5" },
          fashion: { DEFAULT: "#DB2777", tint: "#FDF2F8" },
          vehicles: { DEFAULT: "#0D9488", tint: "#F0FDFA" },
          furniture: { DEFAULT: "#D97706", tint: "#FFFBEB" },
          services: { DEFAULT: "#7C3AED", tint: "#F5F3FF" },
          sports: { DEFAULT: "#DC2626", tint: "#FEF2F2" },
          kids: { DEFAULT: "#0284C7", tint: "#F0F9FF" },
        },
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
