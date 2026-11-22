import type { Metadata } from "next";
import { National_Park, Fira_Sans } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/site";

const nationalPark = National_Park({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-national-park",
  display: "swap",
});

const firaSans = Fira_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-fira-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.baseUrl),
  title: {
    default: SITE.title,
    template: "%s — Chemins et Fontaines",
  },
  description: SITE.description,
  openGraph: {
    siteName: SITE.name,
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${nationalPark.variable} ${firaSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
