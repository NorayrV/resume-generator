import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * The landing page's header.
 *
 * Three links and one call to action. No dropdowns and no hamburger: the
 * marketing site is one page plus pricing, so a menu button would hide three
 * links behind a tap for no gain. Below `sm` the links drop away and the
 * button stays, because on a phone the only thing worth a tap is signing up.
 *
 * `onHome` decides whether the section links are same-page anchors or full
 * links back to the landing page — a bare "#accuracy" on /pricing would
 * scroll to nothing.
 */

export function MarketingNav({ onHome = false }: { onHome?: boolean }) {
  const home = onHome ? "" : "/login";
  const start = `${home}#start`;

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

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Link
            href={start}
            className="hidden h-9 items-center rounded-md px-3 text-small font-medium text-muted transition-colors hover:text-ink sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href={start}
            className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-small font-medium text-on-accent shadow-sm transition-colors hover:bg-accent/90"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
