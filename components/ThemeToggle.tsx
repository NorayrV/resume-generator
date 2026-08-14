"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, currentTheme, type Theme } from "@/lib/theme";

/**
 * Switches the theme, and says which one is on.
 *
 * The state is read off the document rather than out of storage, because by
 * the time this mounts the script in <head> has already decided — including
 * the case where there is no stored choice and the operating system's
 * preference won. Reading storage here would show "light" to someone whose
 * machine is set to dark.
 *
 * Until that read happens the button renders in a neutral state with no icon,
 * which is the honest thing to show: the server has no way of knowing which
 * theme this visitor gets, so anything else would be a guess that flickers.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => setTheme(currentTheme()), []);

  function toggle() {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      /*
       * The label names the destination, not the current state — "switch to
       * dark mode" tells you what pressing it does, which is what a screen
       * reader user needs. aria-pressed would describe a state that has no
       * obvious "on".
       */
      aria-label={theme ? `Switch to ${next} mode` : "Switch theme"}
      title={theme ? `Switch to ${next} mode` : "Switch theme"}
      className={`flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink ${className}`}
    >
      {/*
        The icon shows the destination, not the current state, so it agrees
        with the label beside it: in light mode you see a moon and the label
        reads "switch to dark mode". Showing the current theme instead would
        pair a sun with "switch to dark mode", which reads as a contradiction.
      */}
      {theme === "dark" ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : theme === "light" ? (
        <Moon className="h-4 w-4" aria-hidden />
      ) : (
        /* Pre-hydration: hold the space so the header does not shift. */
        <span className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
