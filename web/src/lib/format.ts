export const cx = (...p: (string | false | null | undefined)[]) => p.filter(Boolean).join(" ");

export function eur(v: number, digits = 0, lang: "en" | "fr" = "en") {
  return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(v);
}

export function compactEur(v: number, lang: "en" | "fr" = "en") {
  return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

export function num(v: number, lang: "en" | "fr" = "en", digits = 0) {
  return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: digits }).format(v);
}

export const pct = (v: number, digits = 1) => `${v.toFixed(digits)}%`;

export function shortAddr(a?: string | null) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export function dateLabel(ts: number, lang: "en" | "fr" = "en", withYear = true) {
  return new Date(ts * 1000).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function relative(ts: number, now: number, lang: "en" | "fr" = "en") {
  const rtf = new Intl.RelativeTimeFormat(lang === "fr" ? "fr" : "en", { numeric: "auto" });
  const d = ts - now;
  const abs = Math.abs(d);
  if (abs < 3600) return rtf.format(Math.round(d / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(d / 3600), "hour");
  if (abs < 86400 * 45) return rtf.format(Math.round(d / 86400), "day");
  return rtf.format(Math.round(d / (86400 * 30)), "month");
}

export function countdown(seconds: number, lang: "en" | "fr" = "en") {
  if (seconds <= 0) return lang === "fr" ? "Terminé" : "Closed";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return lang === "fr" ? `${d} j ${h} h` : `${d}d ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export const COUNTRIES: Record<number, { code: string; en: string; fr: string; flag: string }> = {
  250: { code: "FR", en: "France", fr: "France", flag: "🇫🇷" },
  826: { code: "GB", en: "United Kingdom", fr: "Royaume-Uni", flag: "🇬🇧" },
  504: { code: "MA", en: "Morocco", fr: "Maroc", flag: "🇲🇦" },
  620: { code: "PT", en: "Portugal", fr: "Portugal", flag: "🇵🇹" },
  724: { code: "ES", en: "Spain", fr: "Espagne", flag: "🇪🇸" },
  276: { code: "DE", en: "Germany", fr: "Allemagne", flag: "🇩🇪" },
  380: { code: "IT", en: "Italy", fr: "Italie", flag: "🇮🇹" },
  56: { code: "BE", en: "Belgium", fr: "Belgique", flag: "🇧🇪" },
  784: { code: "AE", en: "United Arab Emirates", fr: "Émirats arabes unis", flag: "🇦🇪" },
  840: { code: "US", en: "United States", fr: "États-Unis", flag: "🇺🇸" },
};

export const CATEGORY_COLORS: Record<string, string> = {
  residential: "var(--chart-1)",
  hospitality: "var(--chart-2)",
  commercial: "var(--chart-3)",
  student: "var(--chart-4)",
  land: "var(--chart-5)",
};

export const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)"];

/** Prefixes public asset paths with the deployment base path (GitHub Pages serves under /keystonia). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const withBase = (p: string) => (p.startsWith("/") && BASE_PATH && !p.startsWith(BASE_PATH) ? `${BASE_PATH}${p}` : p);
