import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { Footer, Toasts, TopNav } from "@/components/shell";
import { GuidedTour } from "@/components/guided-tour";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { LangProvider } from "@/lib/i18n";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const label = JetBrains_Mono({ variable: "--font-label", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Keystonia — real estate, tokenized",
  description: "A full-stack tokenization platform: compliant share tokens, all-or-nothing offerings, on-chain income, secondary market and shareholder governance.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${label.variable} h-full antialiased`}>
      <head>
        {/* Clash Display + General Sans (Indian Type Foundry, free licence), served by Fontshare. */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600&display=swap" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap" />
      </head>
      <body className="flex min-h-full flex-col bg-bg text-ink">
        <LangProvider>
          <Suspense fallback={<div className="h-[84px]" />}>
            <TopNav />
          </Suspense>
          <main className="min-w-0 flex-1">{children}</main>
          <Footer />
          <Toasts />
          <GuidedTour />
          <Suspense fallback={null}>
            <SmoothScroll />
          </Suspense>
          <div className="grain" aria-hidden />
        </LangProvider>
      </body>
    </html>
  );
}
