/**
 * The cvmaxxing lockup: the mark, optionally beside the wordmark.
 *
 * Uses plain <img> rather than next/image on purpose. next/image would put
 * this through Vercel's image optimiser — a billed request, and the sharp
 * dependency at runtime — to serve a two-kilobyte mark that never changes
 * size. Explicit width and height keep it from shifting the header while it
 * loads.
 *
 * Two files, one per theme: the mark is a solid silhouette, so the ink
 * version disappears against a dark header. Both are rendered and one is
 * hidden with a `dark:` class rather than swapped in JavaScript, because a
 * state-driven swap cannot run before the first paint and would flash the
 * wrong mark on every dark-mode load. The cost is one extra 16 kB image,
 * cached after the first visit.
 *
 * public/logo-mark*.png are generated from public/logo.png, which is a white
 * mark on an opaque black rectangle and so cannot sit on a light background
 * as-is. See scripts/build-logo-assets.py.
 */

/** Natural size of the generated mark, used to keep the aspect ratio honest. */
const RATIO = 389 / 419;

export function Logo({
  size = 20,
  withWordmark = true,
  className = "",
}: {
  /** Height of the mark in pixels. The width follows from it. */
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  const width = Math.round(size * RATIO);
  const alt = withWordmark ? "" : "cvmaxxing";
  const hidden = withWordmark || undefined;

  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <img
        src="/logo-mark.png"
        alt={alt}
        aria-hidden={hidden}
        width={width}
        height={size}
        className="shrink-0 dark:hidden"
      />
      {/*
        aria-hidden unconditionally: when the wordmark is off, the light mark
        above already carries the alt text, and both are in the DOM at once.
        Without this a screen reader would announce "cvmaxxing" twice.
      */}
      <img
        src="/logo-mark-dark.png"
        alt=""
        aria-hidden
        width={width}
        height={size}
        className="hidden shrink-0 dark:block"
      />
      {withWordmark && (
        <span className="whitespace-nowrap text-[0.9375rem] font-semibold tracking-[-0.01em]">
          cvmaxxing
        </span>
      )}
    </span>
  );
}
