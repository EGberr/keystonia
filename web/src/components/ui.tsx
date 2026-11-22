"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/format";
import { useLang } from "@/lib/i18n";

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: string; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-accent-ink">{eyebrow}</p>}
        <h1 className="font-serif text-[40px] leading-[1.04] tracking-tight sm:text-[48px]">{title}</h1>
        {children && <div className="mt-3 text-[14.5px] leading-relaxed text-ink-2">{children}</div>}
      </div>
      {actions}
    </header>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "positive" | "negative" }) {
  return (
    <div className="card p-4">
      <p className="text-[11.5px] text-muted">{label}</p>
      <p className={cx("num mt-1 text-[26px] font-semibold leading-none", tone === "positive" && "text-positive", tone === "negative" && "text-negative")}>{value}</p>
      {hint && <p className="mt-1.5 text-[11.5px] text-muted">{hint}</p>}
    </div>
  );
}

export function Panel({ title, subtitle, children, className, action }: { title: string; subtitle?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cx("card p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[13.5px] font-medium text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
        active ? "border-ink bg-ink text-bg" : "hairline bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function Growth({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={cx("num inline-flex items-center rounded-md px-1.5 py-0.5 text-[11.5px] font-medium", up ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative")}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("shimmer rounded-xl", className)} />;
}

export function ErrorState({ message }: { message: string }) {
  const { t } = useLang();
  return (
    <div className="card mx-auto mt-16 max-w-md p-6 text-center">
      <p className="font-medium">{t("common.error")}</p>
      <p className="mt-1 text-[13px] text-muted">{message}</p>
      <p className="mt-3 text-[12px] text-muted">{t("common.backend_down")}</p>
    </div>
  );
}
