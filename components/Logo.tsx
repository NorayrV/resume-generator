/**
 * The Gatecrash lockup: the mark, optionally beside the wordmark.
 *
 * Uses a plain <img> rather than next/image on purpose. next/image would put
 * this through Vercel's image optimiser — a billed request, and the sharp
 * dependency at runtime — to serve a two-kilobyte mark that never changes
 * size. Explicit width and height keep it from shifting the header while it
 * loads.
 *
 * public/logo-mark.png is generated from public/logo.png, which is a white
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
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <img
        src="/logo-mark.png"
        alt={withWordmark ? "" : "Gatecrash"}
        aria-hidden={withWordmark || undefined}
        width={Math.round(size * RATIO)}
        height={size}
        className="shrink-0"
      />
      {withWordmark && (
        <span className="whitespace-nowrap text-[0.9375rem] font-semibold tracking-[-0.01em]">
          Gatecrash
        </span>
      )}
    </span>
  );
}
