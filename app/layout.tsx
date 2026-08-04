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
  title: "Resume Generator",
  description: "Tailor a resume and cover letter to one job description.",
  robots: { index: false, follow: false },
  /*
   * Domain ownership proof for the Cryptomus merchant account. It lives in the
   * root layout rather than on one page because a signed-out visitor — which
   * is what their checker is — gets redirected from "/" to "/login", so the
   * tag has to be present wherever that redirect lands.
   */
  other: { cryptomus: "2c216d1a" },
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
