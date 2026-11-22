import type { Metadata } from "next";
import { Bodoni_Moda, JetBrains_Mono, Manrope } from "next/font/google";
import { Suspense } from "react";
import { Footer, Toasts, TopNav } from "@/components/shell";
import { LangProvider } from "@/lib/i18n";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const display = Bodoni_Moda({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"] });
const text = Manrope({ variable: "--font-text", subsets: ["latin"], weight: ["400", "500", "600"] });
const label = JetBrains_Mono({ variable: "--font-label", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Keystonia — own the address, not the mortgage",
  description: "A full-stack tokenization platform: compliant share tokens, all-or-nothing offerings, on-chain income, secondary market and shareholder governance.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable} ${label.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg text-ink">
        <LangProvider>
          <Suspense fallback={<div className="h-[84px]" />}>
            <TopNav />
          </Suspense>
          <main className="min-w-0 flex-1">{children}</main>
          <Footer />
          <Toasts />
          <div className="grain" aria-hidden />
        </LangProvider>
      </body>
    </html>
  );
}
