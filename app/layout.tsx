import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  preload: true,
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gatecrash",
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
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
