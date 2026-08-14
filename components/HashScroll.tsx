"use client";

import { useEffect } from "react";

/**
 * Land on the right section when the page is opened with a hash.
 *
 * The browser tries this itself the moment it parses the fragment, and on
 * this page it does not survive. Two things undo it: the layout is still
 * settling when the attempt is made — the web font swaps in and the hero
 * visual takes its final height, moving every section below it — and the App
 * Router restores scroll during hydration, which puts the page back at the
 * top. Measured on a cold load of /login#pricing: scrollY 0, with the target
 * 2,363px further down.
 *
 * A single re-jump after mount is not enough either, because restoration can
 * land after it. So this re-applies the jump on a short schedule and stops as
 * soon as the target is actually in place. Bounded either way: it gives up
 * after the last attempt, so it can never fight a user who has started
 * scrolling.
 *
 * Runs on mount only. A hash link clicked later is an ordinary same-page
 * navigation, which the browser handles correctly on its own.
 */

/** When to try, in milliseconds after mount. */
const ATTEMPTS = [0, 60, 150, 320, 600];

/** How close to the top counts as arrived. */
const TOLERANCE = 120;

export function HashScroll() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.replace("#", ""));
    if (!id) return;

    const timers: number[] = [];
    /* Once the reader takes over, stop moving the page under them. */
    let cancelled = false;
    const stop = () => {
      cancelled = true;
    };
    window.addEventListener("wheel", stop, { passive: true, once: true });
    window.addEventListener("touchstart", stop, { passive: true, once: true });
    window.addEventListener("keydown", stop, { once: true });

    for (const delay of ATTEMPTS) {
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;

          const target = document.getElementById(id);
          if (!target) return;

          const { top } = target.getBoundingClientRect();
          if (Math.abs(top) <= TOLERANCE) return; // already there

          /*
           * Instant, not smooth. `html` carries scroll-behavior: smooth for
           * in-page clicks, which is right when the reader asked for the
           * movement — but animating two thousand pixels at load looks like
           * the page is running away from them.
           *
           * scroll-margin-top on [id] keeps this clear of the sticky header.
           */
          target.scrollIntoView({ behavior: "instant", block: "start" });
        }, delay),
      );
    }

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, []);

  return null;
}
