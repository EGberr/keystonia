import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { Suspense } from "react";
import { Footer, Toasts, TopNav } from "@/components/shell";
import { LangProvider } from "@/lib/i18n";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Fraunces({ variable: "--font-serif", subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Keystonia — tokenized real estate in Paris, London, Marrakech and Lisbon",
  description: "A full-stack tokenization platform: compliant share tokens, all-or-nothing offerings, on-chain income, secondary market and shareholder governance.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg text-ink">
        <LangProvider>
          <Suspense fallback={<div className="h-[94px] border-b hairline" />}>
            <TopNav />
          </Suspense>
          <main className="min-w-0 flex-1">{children}</main>
          <Footer />
          <Toasts />
        </LangProvider>
      </body>
    </html>
  );
}
