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
 * `onHome` decides whether the section links are same-page anchors or full
 * links back to the landing page — a bare "#accuracy" on /pricing would
 * scroll to nothing.
 */

export function MarketingNav({ onHome = false }: { onHome?: boolean }) {
  const home = onHome ? "" : "/login";

  const links = [
    { href: `${home}#how-it-works`, label: "How it works" },
    { href: `${home}#accuracy`, label: "Accuracy" },
    { href: "/pricing", label: "Pricing" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="section flex h-16 items-center gap-6">
        <Link href="/login" aria-label="Gatecrash" className="shrink-0">
          <Logo size={22} />
        </Link>

        <nav aria-label="Sections" className="hidden gap-1 sm:flex">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-small font-medium text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
