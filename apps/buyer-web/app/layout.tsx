import type { Metadata } from "next";
import { Manrope, Fraunces, JetBrains_Mono } from "next/font/google";
import { CookieConsent } from "@/components/ui/CookieConsent";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz"],
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prive Exchange — Live Carbon Credit Trading",
  description:
    "A blockchain-native carbon credit exchange. Trade tokenised credits 24/7 with exchange-grade reliability and registry-verified integrity.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
