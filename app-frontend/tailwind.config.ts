import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          base: "var(--bg-base)",
          raised: "var(--bg-raised)",
          elevated: "var(--bg-elevated)",
          high: "var(--bg-high)",
        },
        glass: {
          DEFAULT: "var(--glass)",
          border: "var(--glass-border)",
          hover: "var(--glass-hover)",
        },
        blue: {
          DEFAULT: "var(--blue)",
          dim: "var(--blue-dim)",
          border: "var(--blue-border)",
          text: "var(--blue-text)",
        },
        purple: {
          DEFAULT: "var(--purple)",
        },
        green: {
          DEFAULT: "var(--green)",
          dim: "var(--green-dim)",
          border: "var(--green-border)",
        },
        red: {
          DEFAULT: "var(--red)",
          dim: "var(--red-dim)",
          border: "var(--red-border)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          dim: "var(--amber-dim)",
          border: "var(--amber-border)",
        },
        text: {
          1: "var(--text-1)",
          2: "var(--text-2)",
          3: "var(--text-3)",
          4: "var(--text-4)",
        },
        topnav: {
          bg: "var(--topnav-bg)",
        },
        sidebar: {
          bg: "var(--sidebar-bg)",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-dm-mono)", ...defaultTheme.fontFamily.mono],
      },
      fontSize: {
        display: [
          "56px",
          {
            lineHeight: "1.1",
            letterSpacing: "-0.03em",
            fontWeight: "700",
          },
        ],
      },
      borderRadius: {
        pill: "20px",
        card: "12px",
        panel: "10px",
      },
      backdropBlur: {
        topnav: "12px",
        sidebar: "8px",
        card: "4px",
      },
      spacing: {
        "sp-1": "4px",
        "sp-2": "8px",
        "sp-3": "12px",
        "sp-4": "16px",
        "sp-6": "24px",
        "sp-8": "32px",
        "sp-12": "48px",
        "sp-20": "80px",
      },
      boxShadow: {
        focus: "var(--focus-ring)",
      },
    },
  },
  plugins: [],
};

export default config;
