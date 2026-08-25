import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { THEME_COLOR, THEME_INIT_SCRIPT } from "@/lib/theme";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  preload: true,
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "cvmaxxing",
  description:
    "Paste a job posting and get a resume and cover letter rewritten around it, using your own experience — never invented.",
  /*
   * Indexable on purpose. This was noindex while the site was private, which
   * would now keep it out of search results entirely.
   *
   * Only the landing page is actually reachable by a crawler: middleware sends
   * signed-out visitors from every other route to /login, so there is nothing
   * private for a search engine to reach and no per-page opt-out needed.
   */
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /*
     * suppressHydrationWarning because the script below writes class="dark"
     * onto this element before React arrives. Without it, React compares the
     * server's bare <html> against the browser's themed one and logs a
     * mismatch on every dark-mode page load. The warning is the only thing
     * being suppressed — nothing else on this element is dynamic.
     */
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/*
         * Declared with the light value and rewritten by the script below —
         * it has to exist in the markup before the script can find it.
         */}
        <meta name="theme-color" content={THEME_COLOR.light} />
        {/*
         * Runs before the browser paints anything, which is the whole point:
         * set the class in an effect instead and the page renders white for a
         * frame and then snaps to dark. Blocking here costs well under a
         * millisecond and buys a first paint that is already correct.
         */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
