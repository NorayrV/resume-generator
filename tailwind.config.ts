import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "hsl(var(--paper))",
        surface: "hsl(var(--surface))",
        ink: "hsl(var(--ink))",
        muted: "hsl(var(--muted))",
        faint: "hsl(var(--faint))",
        placeholder: "hsl(var(--placeholder))",
        line: {
          DEFAULT: "hsl(var(--line))",
          soft: "hsl(var(--line-soft))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          soft: "hsl(var(--accent-soft))",
          line: "hsl(var(--accent-line))",
        },
        flag: {
          DEFAULT: "hsl(var(--flag))",
          soft: "hsl(var(--flag-soft))",
        },
        good: {
          DEFAULT: "hsl(var(--good))",
          soft: "hsl(var(--good-soft))",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        body: ["0.9375rem", { lineHeight: "1.6" }],
        small: ["0.8125rem", { lineHeight: "1.55" }],
        micro: ["0.75rem", { lineHeight: "1.5" }],
      },
      borderRadius: {
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        /*
         * Two shadows, both barely there. Depth here means "this sits above
         * the page", not "this is a floating glass panel".
         */
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 4px 12px -2px rgb(0 0 0 / 0.06)",
        lift: "0 2px 4px 0 rgb(0 0 0 / 0.04), 0 12px 28px -6px rgb(0 0 0 / 0.10)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        sweep: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(500%)" },
        },
        /* The indeterminate bar under a running generation. */
        flow: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        rise: "rise 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
        sweep: "sweep 1.3s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        flow: "flow 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
