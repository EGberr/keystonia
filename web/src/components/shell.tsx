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

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="flex items-baseline gap-1 leading-none">
      <span className="font-serif tracking-[-0.03em]" style={{ fontSize: size }}>
        Keystonia
      </span>
      <span aria-hidden className="text-accent" style={{ fontSize: size * 0.5 }}>
        ✦
      </span>
    </span>
  );
}

function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-0.5 font-mono text-[10.5px] tracking-[0.14em]" role="group" aria-label="Language">
      {(["en", "fr"] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={cx("rounded-full px-2 py-1 uppercase transition-colors", lang === l ? "text-ink" : "text-muted/70 hover:text-ink")}>
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
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-[13px] transition hover:bg-white/[0.08]">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-[#1a140b]">
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
  const [scrolled, setScrolled] = useState(false);
  const home = pathname === "/";
  const active = (href: string) => pathname.startsWith(href) || (href === "/invest" && pathname.startsWith("/assets"));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        <p className="flex items-center justify-center gap-2 bg-black/60 px-4 py-1.5 text-center font-mono text-[9.5px] uppercase tracking-[0.2em] text-muted backdrop-blur">
          <ShieldCheck size={11} className="shrink-0 text-accent" />
          {t("banner.demo")}
        </p>
        <div className="px-3 pt-3 sm:px-5">
          <div className={cx("mx-auto flex h-14 max-w-[1320px] items-center gap-6 rounded-full pl-6 pr-2 transition-all duration-500", scrolled || !home || open ? "glass" : "border border-transparent")}>
            <Link href="/" aria-label="Keystonia" onClick={() => setOpen(false)}>
              <Logo />
            </Link>
            <nav className="hidden items-center gap-1 xl:flex">
              {NAV.map(({ href, key }) => (
                <Link key={href} href={href} className={cx("relative rounded-full px-3.5 py-1.5 text-[13px] tracking-[-0.005em] transition-colors", active(href) ? "text-ink" : "text-ink-2 hover:text-ink")}>
                  {t(key)}
                  {active(href) && <span className="absolute inset-x-3.5 -bottom-0.5 h-px bg-accent" />}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <LangSwitch />
              <WalletMenu />
              <button aria-label={t("nav.menu")} onClick={() => setOpen((o) => !o)} className="rounded-full p-2.5 hover:bg-white/5 xl:hidden">
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
          {open && (
            <nav className="glass mx-auto mt-2 flex max-w-[1320px] flex-col gap-1 rounded-[28px] p-3 xl:hidden">
              {NAV.map(({ href, key }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className={cx("rounded-2xl px-4 py-3 font-serif text-[22px]", active(href) ? "text-ink" : "text-ink-2")}>
                  {t(key)}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>
      {!home && <div aria-hidden className="h-[112px]" />}
    </>
  );
}

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="relative mt-32 overflow-hidden border-t hairline">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-5 pb-10 pt-16 text-[13px] text-muted sm:px-8 md:grid-cols-[1.6fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <p className="label">— {t("footer.kicker")}</p>
          <p className="max-w-md leading-relaxed text-ink-2">{t("footer.text")}</p>
        </div>
        <div className="flex flex-col gap-2.5">
          {NAV.slice(0, 4).map(({ href, key }) => (
            <Link key={href} href={href} className="hover:text-ink">
              {t(key)}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-2.5">
          <Link href="/transparency" className="hover:text-ink">
            {t("nav.transparency")}
          </Link>
          <Link href="/list" className="hover:text-ink">
            {t("nav.list")}
          </Link>
          <Link href="/credits" className="hover:text-ink">
            {t("footer.credits")}
          </Link>
          <a href="https://github.com/EGberr/keystonia" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
            GitHub <ExternalLink size={12} />
          </a>
        </div>
      </div>
      <p aria-hidden className="pointer-events-none -mb-[0.2em] select-none whitespace-nowrap text-center font-serif text-[23vw] leading-[0.8] tracking-[-0.06em] text-white/[0.035]">
        Keystonia
      </p>
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
