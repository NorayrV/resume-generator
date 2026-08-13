"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CreditCard, FileText, LogOut, User } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Logo } from "./Logo";

/**
 * Three destinations, always visible: Generate (what you do daily), Profile
 * (what you edit rarely) and Account (usage and billing). The current one is
 * underlined in blue, so where you are and where else you can go is
 * answerable at a glance.
 */

const TABS = [
  { href: "/", label: "Generate", icon: FileText },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/account", label: "Account", icon: CreditCard },
];

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
        {/*
          The mark stays at every width; the wordmark beside it is the first
          thing to go when the nav needs the room.
        */}
        <Link href="/" aria-label="Gatecrash" className="flex items-center">
          <Logo size={20} withWordmark={false} className="sm:hidden" />
          <Logo size={20} className="hidden sm:flex" />
        </Link>

        <nav className="flex h-full items-center gap-1">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-14 items-center gap-2 px-2.5 text-small font-medium transition-colors sm:px-3 ${
                  active ? "text-accent" : "text-muted hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
                {active && (
                  <span
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent"
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {subtitle && (
            <span className="hidden max-w-[14rem] truncate text-small text-muted sm:inline">
              {subtitle}
            </span>
          )}
          <button
            onClick={signOut}
            className="flex h-8 w-8 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface hover:text-ink"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
