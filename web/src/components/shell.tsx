"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ExternalLink, Loader2, Menu, ShieldCheck, Wallet, X, XCircle } from "lucide-react";
import { api, type Config } from "@/lib/api";
import { dismissToast, useApi, useToasts, useWallet } from "@/lib/chain";
import { COUNTRIES, cx, shortAddr } from "@/lib/format";
import { useLang, type TKey } from "@/lib/i18n";

const NAV: { href: string; key: TKey }[] = [
  { href: "/invest", key: "nav.invest" },
  { href: "/market", key: "nav.market" },
  { href: "/portfolio", key: "nav.portfolio" },
  { href: "/governance", key: "nav.governance" },
  { href: "/list", key: "nav.list" },
  { href: "/transparency", key: "nav.transparency" },
];

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <path d="M16 3 4 9v14l12 6 12-6V9L16 3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M16 3v26M4 9l12 6 12-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M16 15 28 9v14l-12 6V15Z" fill="var(--accent)" opacity="0.85" />
      </svg>
      <span className="font-serif text-[21px] leading-none tracking-tight">Keystonia</span>
    </span>
  );
}

function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex rounded-full border hairline bg-surface p-0.5 text-[11.5px] font-medium" role="group" aria-label="Language">
      {(["en", "fr"] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={cx("rounded-full px-2.5 py-1 uppercase transition-colors", lang === l ? "bg-ink text-bg" : "text-muted hover:text-ink")}>
          {l}
        </button>
      ))}
    </div>
  );
}

function WalletMenu() {
  const { t, lang } = useLang();
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: config } = useApi<Config>("config", api.config);
  const persona = config?.personas.find((p) => p.address.toLowerCase() === wallet.address.toLowerCase());

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  const group = (role: "investor" | "issuer") => config?.personas.filter((p) => p.role === role) ?? [];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full border hairline bg-surface py-1.5 pl-2 pr-3 text-[13px] hover:border-line-strong">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-ink text-[11px] font-semibold text-bg">
          {(persona?.name ?? "W").slice(0, 1)}
        </span>
        <span className="hidden max-w-[130px] truncate sm:block">{persona?.name ?? shortAddr(wallet.address)}</span>
        <ChevronDown size={14} className="text-muted" />
      </button>
      {open && (
        <div className="card absolute right-0 top-[calc(100%+8px)] z-50 w-[300px] overflow-hidden p-2">
          <div className="px-2 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{wallet.isDemo ? t("wallet.demo") : t("wallet.injected")}</p>
            <p className="mt-1 font-medium">{persona?.name ?? shortAddr(wallet.address)}</p>
            <p className="num text-[11.5px] text-muted">{shortAddr(wallet.address)}</p>
          </div>
          <div className="scroll-thin max-h-[320px] overflow-y-auto border-t hairline pt-1">
            {(["investor", "issuer"] as const).map((role) => (
              <div key={role}>
                <p className="px-2 pb-1 pt-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
                  {role === "investor" ? t("wallet.investors") : t("wallet.issuers")}
                </p>
                {group(role).map((p) => (
                  <button
                    key={p.address}
                    onClick={() => {
                      wallet.useDemo(p.index);
                      setOpen(false);
                    }}
                    className={cx("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-surface-2", p.address.toLowerCase() === wallet.address.toLowerCase() && "bg-surface-2")}
                  >
                    <span className="w-5 text-center">{COUNTRIES[p.country]?.flag}</span>
                    <span className="flex-1 truncate">{p.name}</span>
                    {p.country === 840 && <span className="text-[10.5px] text-warning">Reg S</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-1 border-t hairline pt-2">
            <button
              onClick={() => wallet.connectInjected().then(() => setOpen(false)).catch((e) => alert(String(e)))}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-accent-ink hover:bg-surface-2"
            >
              <Wallet size={15} /> {t("wallet.connect")}
            </button>
            {!wallet.isDemo && (
              <button onClick={() => wallet.useDemo(10)} className="w-full rounded-lg px-2 py-2 text-left text-[13px] text-muted hover:bg-surface-2">
                {t("wallet.disconnect")}
              </button>
            )}
          </div>
          <p className="px-2 pb-1 pt-2 text-[10.5px] leading-snug text-muted">{lang === "fr" ? "Profils de démo signés localement avec les clés de test publiques d'Anvil." : "Demo profiles sign locally with Anvil's public test keys."}</p>
        </div>
      )}
    </div>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const active = (href: string) => pathname.startsWith(href) || (href === "/invest" && pathname.startsWith("/assets"));
  return (
    <>
      <div className="bg-accent-ink px-4 py-1.5 text-center text-[11.5px] font-medium text-bg">
        <ShieldCheck size={12} className="mr-1.5 inline -translate-y-px" />
        {t("banner.demo")}
      </div>
      <header className="sticky top-0 z-40 border-b hairline bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-6 px-5 sm:px-8">
          <Link href="/" aria-label="Keystonia" onClick={() => setOpen(false)}>
            <Logo />
          </Link>
          <nav className="hidden items-center gap-0.5 xl:flex">
            {NAV.map(({ href, key }) => (
              <Link key={href} href={href} className={cx("rounded-full px-3.5 py-1.5 text-[13.5px] transition-colors", active(href) ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:text-ink")}>
                {t(key)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <LangSwitch />
            <WalletMenu />
            <button aria-label={t("nav.menu")} onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 hover:bg-surface-2 xl:hidden">
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="flex flex-col gap-1 border-t hairline px-5 py-3 xl:hidden">
            {NAV.map(({ href, key }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className={cx("rounded-xl px-3 py-2.5 text-[14px]", active(href) ? "bg-surface-2 font-medium" : "text-ink-2")}>
                {t(key)}
              </Link>
            ))}
          </nav>
        )}
      </header>
    </>
  );
}

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="mt-24 border-t hairline">
      <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-12 text-[12.5px] text-muted sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-md leading-relaxed">{t("footer.text")}</p>
        </div>
        <div className="flex flex-col gap-2">
          {NAV.slice(0, 4).map(({ href, key }) => (
            <Link key={href} href={href} className="hover:text-ink">
              {t(key)}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/transparency" className="hover:text-ink">
            {t("nav.transparency")}
          </Link>
          <Link href="/credits" className="hover:text-ink">
            {t("footer.credits")}
          </Link>
          <a href="https://github.com/EGberr/keystonia" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
            GitHub <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </footer>
  );
}

export function Toasts() {
  const toasts = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="card pointer-events-auto flex items-start gap-3 p-3.5" role="status">
          {t.status === "pending" ? <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-accent-ink" /> : t.status === "success" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-positive" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-negative" />}
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium">{t.title}</p>
            {t.detail && <p className="mt-0.5 break-words text-[12px] text-muted">{t.detail}</p>}
            {t.hash && <p className="num mt-0.5 text-[11px] text-muted">tx {shortAddr(t.hash)}</p>}
          </div>
          <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="text-muted hover:text-ink">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
