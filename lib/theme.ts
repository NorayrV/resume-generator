/**
 * The theme, in one place.
 *
 * Three things have to agree about which theme is on: the blocking script in
 * the document head, the toggle in the header, and the CSS. They agree by
 * sharing this file — the storage key, the class name and the resolution
 * order are defined once here rather than restated in each.
 */

export type Theme = "light" | "dark";

/** Where the explicit choice lives. */
export const THEME_KEY = "theme";

/** The class Tailwind's `darkMode: "class"` looks for. */
export const DARK_CLASS = "dark";

/** Browser chrome colour, per theme. Matches --surface in globals.css. */
export const THEME_COLOR: Record<Theme, string> = {
  light: "#fafafa",
  dark: "#0e1116",
};

/**
 * Applies a theme to the document, and records it as the explicit choice.
 *
 * Also updates <meta name="theme-color">, which is what tints the address bar
 * on mobile Safari and Chrome — leaving it behind is why a themed page can
 * still show a white bar above it.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle(DARK_CLASS, theme === "dark");
  root.style.colorScheme = theme;

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[theme]);

  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private browsing: the choice holds for this tab and no longer.
  }
}

/** What the document is currently wearing. */
export function currentTheme(): Theme {
  return document.documentElement.classList.contains(DARK_CLASS)
    ? "dark"
    : "light";
}

/**
 * The blocking script, inlined into <head> by app/layout.tsx.
 *
 * Resolution order, highest first:
 *
 *   1. an explicit choice in localStorage
 *   2. the operating system's preference
 *   3. light
 *
 * Written as a string of plain ES5 in an IIFE, wrapped in try/catch: it runs
 * before anything else on the page, so a throw here — a browser with
 * localStorage disabled, for instance — would take the whole document with
 * it. Failing quietly to light is the correct outcome.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var s=localStorage.getItem(${JSON.stringify(THEME_KEY)});
var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var r=document.documentElement;
if(d)r.classList.add(${JSON.stringify(DARK_CLASS)});
r.style.colorScheme=d?'dark':'light';
var m=document.querySelector('meta[name="theme-color"]');
if(m)m.setAttribute('content',d?${JSON.stringify(THEME_COLOR.dark)}:${JSON.stringify(THEME_COLOR.light)});
}catch(e){}})();`;
