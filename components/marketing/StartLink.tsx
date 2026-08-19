"use client";

/**
 * A call to action that returns the reader to the sign-in card at the top.
 *
 * Measured on the current page: the pricing buttons sit 2,719px above their
 * own target at 1280 and 4,034px above it on a 375px phone; the closing call
 * to action is 4,011px away. `html` carries scroll-behavior: smooth for
 * in-page clicks, so pressing "Start free" animated every section the reader
 * had just worked through, in reverse, before arriving. That reads as the page
 * running away rather than as an answer to the press.
 *
 * HashScroll reached the same conclusion about the same distance on load and
 * jumps instantly. This narrows the page's blanket "smooth for clicks" rule
 * to exclude the one journey long enough to hurt; the nav's short hops between
 * neighbouring sections keep their animation, which is where it earns its
 * place.
 *
 * Focus moves with the viewport. #start is a div, so it cannot take focus on
 * its own — it carries tabIndex={-1} for this.
 */
export function StartLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  function jump(event: React.MouseEvent<HTMLAnchorElement>) {
    // Leave modified clicks to the browser: a new tab or window is a
    // deliberate request that this handler has no business intercepting.
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = document.getElementById("start");
    if (!target) return; // Nothing to improve on; let the anchor do its job.

    event.preventDefault();
    target.scrollIntoView({
      behavior: "instant" as ScrollBehavior,
      block: "start",
    });
    target.focus({ preventScroll: true });

    // Keep the address bar honest without adding a history entry to back out
    // of — the reader asked to move down the page, not to navigate.
    history.replaceState(null, "", "#start");
  }

  return (
    <a href="#start" onClick={jump} className={className}>
      {children}
    </a>
  );
}
