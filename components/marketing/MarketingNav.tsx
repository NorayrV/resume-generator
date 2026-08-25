import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * The landing page's header.
 *
 * Three section links and the theme toggle. No dropdowns and no hamburger:
 * the marketing site is one page plus pricing, so a menu button would hide
 * three links behind a tap for no gain.
 *
 * There is deliberately no "Sign in" or "Start free" button up here. Both
 * were anchors to #start, and on a desktop the sign-in card is already in
 * view beside the headline — so pressing them scrolled to something the
 * reader was looking at and appeared to do nothing at all. The card in the
 * hero is the call to action; a header button that fakes one is worse than
 * no button.
 *
 * All three links point at sections of the landing page, so they all behave
 * identically: on the landing page they scroll, and from anywhere else they
 * navigate there and then scroll. Pricing used to be the odd one out — a
 * separate route while its neighbours were anchors — which made the menu feel
 * like it worked by accident.
 *
 * `onHome` decides whether they are same-page anchors or full links back to
 * the landing page: a bare "#accuracy" elsewhere would scroll to nothing.
 *
 * The bar wraps rather than holding a fixed height. Tailwind's spacing is in
 * rem, so at 200% text — WCAG 1.4.4, which asks for no loss of content at that
 * size — the three links and the 4.5rem toggle stopped fitting across 768px
 * and pushed the toggle to x=839 on a 768px viewport, taking the whole page
 * into horizontal scroll. Nothing moves at normal text size: the row is 40px
 * tall inside a 64px minimum.
 */

export function MarketingNav({ onHome = false }: { onHome?: boolean }) {
  const home = onHome ? "" : "/login";

  const links = [
    { href: `${home}#how-it-works`, label: "How it works" },
    { href: `${home}#accuracy`, label: "Accuracy" },
    { href: `${home}#pricing`, label: "Pricing" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="section flex min-h-[4rem] flex-wrap items-center gap-x-6 gap-y-2 py-2">
        <Link href="/login" aria-label="cvmaxxing" className="shrink-0">
          <Logo size={22} />
        </Link>

        <nav aria-label="Sections" className="hidden flex-wrap gap-1 sm:flex">
          {links.map(({ href, label }) => {
            const style =
              "rounded-md px-3 py-2 text-small font-medium text-muted transition-colors hover:bg-surface hover:text-ink";

            /*
             * A same-page anchor has to be a plain <a>. next/link treats a
             * bare "#section" as a route change and handles the click itself,
             * and the App Router then does not perform the fragment scroll —
             * the address bar updates and the page sits exactly where it was.
             * These links did nothing at all until this was fixed.
             *
             * A cross-page link is a real navigation, so it stays a Link and
             * keeps the prefetching that comes with it.
             */
            return href.startsWith("#") ? (
              <a key={href} href={href} className={style}>
                {label}
              </a>
            ) : (
              <Link key={href} href={href} className={style}>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
