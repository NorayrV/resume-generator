import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  /*
   * Class-based rather than media-based: the theme is an explicit user
   * choice that has to survive a reload, and `media` would ignore it. The
   * system preference is still honoured — as the initial value only, in the
   * script in app/layout.tsx.
   */
  darkMode: "class",
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
          /* Same blue, used as text or an icon rather than as a fill. */
          text: "hsl(var(--accent-text))",
          soft: "hsl(var(--accent-soft))",
          line: "hsl(var(--accent-line))",
        },
        "on-accent": "hsl(var(--on-accent))",
        flag: {
          DEFAULT: "hsl(var(--flag))",
          soft: "hsl(var(--flag-soft))",
        },
        good: {
          DEFAULT: "hsl(var(--good))",
          soft: "hsl(var(--good-soft))",
        },
        /*
         * The resume sheet. Fixed in both themes — see the note in
         * globals.css about why the document does not follow the app.
         */
        doc: {
          paper: "hsl(var(--doc-paper))",
          ink: "hsl(var(--doc-ink))",
          muted: "hsl(var(--doc-muted))",
          line: "hsl(var(--doc-line))",
          accent: "hsl(var(--doc-accent))",
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
         * Both come from variables so the dark theme can swap them: a shadow
         * tuned for a white page does nothing against a dark one.
         */
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
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
