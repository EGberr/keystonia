"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Database, FileText, RotateCcw, Sparkles, Square } from "lucide-react";
import { api, streamAssistant, type Health, type StreamEvent } from "@/lib/api";
import { useApi } from "@/lib/chain";
import { cx } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { Answer } from "@/components/chat/answer";
import { Trace, type ToolCall } from "@/components/chat/trace";

type Source = Extract<StreamEvent, { type: "source" }>["source"];
type Dataset = Extract<StreamEvent, { type: "dataset" }>["dataset"];
type AssistantMsg = { id: string; role: "assistant"; content: string; status?: string; running: boolean; calls: ToolCall[]; sources: Source[]; datasets: Dataset[]; meta?: { model: string; latency_ms: number; mode: string }; error?: string };
type Msg = { id: string; role: "user"; content: string } | AssistantMsg;

const uid = () => Math.random().toString(36).slice(2, 10);

const SUGGESTIONS = {
  asset: {
    en: ["What drives the net yield of this asset?", "What are the three main risks?", "How was the valuation built?", "What legal structure do I own?"],
    fr: ["Qu'est-ce qui explique le rendement net ?", "Quels sont les trois principaux risques ?", "Comment la valorisation a-t-elle été construite ?", "Quelle structure juridique est-ce que je détiens ?"],
  },
  global: {
    en: ["Which live offerings have the best net yield?", "Compare the Marrakech and Dubai hotels", "Which assets are cheapest per share?", "How does the income distribution work?"],
    fr: ["Quelles levées en cours ont le meilleur rendement net ?", "Compare les actifs hôteliers de Marrakech et Dubaï", "Quels biens ont la part la moins chère ?", "Comment fonctionne la distribution des revenus ?"],
  },
};

function useAnalyst(assetId: string | undefined, lang: "en" | "fr", errorText: string) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const patch = useCallback((id: string, fn: (m: AssistantMsg) => AssistantMsg) => {
    setMessages((ms) => ms.map((m) => (m.id === id && m.role === "assistant" ? fn(m) : m)));
  }, []);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      const user: Msg = { id: uid(), role: "user", content: q };
      const asst: AssistantMsg = { id: uid(), role: "assistant", content: "", running: true, calls: [], sources: [], datasets: [] };
      const history = [...messages, user].map((m) => ({ role: m.role, content: m.content }));
      setMessages((ms) => [...ms, user, asst]);
      setBusy(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const onEvent = (e: StreamEvent) =>
        patch(asst.id, (m) => {
          switch (e.type) {
            case "status":
              return { ...m, status: e.text };
            case "text":
              return { ...m, content: m.content + e.delta };
            case "tool_call":
              return { ...m, calls: [...m.calls, { id: e.id, name: e.name, input: e.input, is_error: e.is_error, summary: e.summary }] };
            case "source":
              return { ...m, sources: [...m.sources, e.source] };
            case "dataset":
              return { ...m, datasets: [...m.datasets, e.dataset] };
            case "done":
              return { ...m, running: false, meta: { model: e.model, latency_ms: e.latency_ms, mode: e.mode } };
            case "error":
              return { ...m, running: false, error: e.message };
          }
        });
      try {
        await streamAssistant(history, onEvent, { signal: ctrl.signal, assetId, lang });
      } catch {
        if (!ctrl.signal.aborted) patch(asst.id, (m) => ({ ...m, error: errorText }));
      } finally {
        patch(asst.id, (m) => ({ ...m, running: false }));
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, messages, patch, assetId, lang, errorText],
  );
  return {
    messages,
    busy,
    send,
    stop: () => abortRef.current?.abort(),
    reset: () => {
      abortRef.current?.abort();
      setMessages([]);
    },
  };
}

function Evidence({ m, active, onPick }: { m: AssistantMsg; active: string | null; onPick: (id: string | null) => void }) {
  const { t } = useLang();
  if (!m.sources.length && !m.datasets.length) return null;
  const open = m.sources.find((s) => s.id === active);
  const ds = m.datasets.find((d) => d.id === active);
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">{t("chat.evidence")}</p>
      <div className="flex flex-wrap gap-1.5">
        {m.sources.map((s) => (
          <button key={s.id} onClick={() => onPick(active === s.id ? null : s.id)} className={cx("flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-left text-[11.5px]", active === s.id ? "border-accent-ink bg-accent-soft" : "hairline bg-surface hover:border-line-strong")}>
            <FileText size={11} className="shrink-0 text-accent-ink" />
            <span className="num font-medium">{s.id}</span>
            <span className="truncate text-ink-2">{s.title} · {s.section}</span>
          </button>
        ))}
        {m.datasets.map((d) => (
          <button key={d.id} onClick={() => onPick(active === d.id ? null : d.id)} className={cx("flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11.5px]", active === d.id ? "border-accent-ink bg-accent-soft" : "hairline bg-surface hover:border-line-strong")}>
            <Database size={11} className="shrink-0 text-accent-ink" />
            <span className="num font-medium">{d.id}</span>
            <span className="truncate text-ink-2">{d.title}</span>
          </button>
        ))}
      </div>
      {open && <blockquote className="mt-2 max-h-48 overflow-y-auto rounded-xl border hairline bg-surface-2/60 p-3 text-[12px] leading-relaxed text-ink-2 scroll-thin">{open.text}</blockquote>}
      {ds && (
        <div className="mt-2 max-h-56 overflow-auto rounded-xl border hairline bg-surface-2/60 p-2 scroll-thin">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="text-left text-muted">
                {Object.keys(ds.rows[0] ?? {}).map((k) => (
                  <th key={k} className="px-1.5 pb-1 font-medium">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ds.rows.map((r, i) => (
                <tr key={i} className="border-t hairline">
                  {Object.values(r).map((v, j) => (
                    <td key={j} className="num px-1.5 py-1 text-ink-2">{String(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Streaming AI analyst grounded in asset documents and on-chain data. `assetId` scopes it to one asset. */
export function Analyst({ assetId, className, height = 560 }: { assetId?: string; className?: string; height?: number }) {
  const { t, lang } = useLang();
  const { data: health } = useApi<Health>("health", api.health);
  const chat = useAnalyst(assetId, lang, t("chat.error"));
  const [input, setInput] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [chat.messages]);

  const submit = (q: string) => {
    chat.send(q);
    setInput("");
  };
  const suggestions = SUGGESTIONS[assetId ? "asset" : "global"][lang];

  return (
    <section className={cx("card flex flex-col overflow-hidden", className)} style={{ height }}>
      <header className="flex items-center gap-3 border-b hairline px-5 py-3.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-ink text-bg">
          <Sparkles size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium">{t("assistant.title")}</p>
          <p className="truncate text-[11.5px] text-muted">{health?.assistant === "offline" ? t("assistant.offline") : "Claude · tool use · cited answers"}</p>
        </div>
        {chat.messages.length > 0 && (
          <button onClick={chat.reset} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-muted hover:bg-surface-2 hover:text-ink">
            <RotateCcw size={12} /> {t("chat.new")}
          </button>
        )}
      </header>

      <div ref={scroller} className="scroll-thin flex-1 overflow-y-auto px-5 py-4">
        {!chat.messages.length && (
          <div className="flex h-full flex-col justify-end gap-3">
            <p className="text-[13px] leading-relaxed text-ink-2">{t("assistant.subtitle")}</p>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((s) => (
                <button key={s} onClick={() => submit(s)} className="rounded-xl border hairline bg-surface px-3 py-2 text-left text-[13px] text-ink-2 transition-colors hover:border-accent-ink hover:text-ink">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {chat.messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="mb-4 flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[13.5px] text-bg">{m.content}</p>
            </div>
          ) : (
            <div key={m.id} className="mb-5">
              <Trace calls={m.calls} status={m.status} running={m.running && !m.content} />
              {m.content && <Answer text={m.content} streaming={m.running} activeCite={active} onCite={(id) => setActive(active === id ? null : id)} />}
              {m.error && <p className="text-[12.5px] text-negative">{m.error}</p>}
              {!m.running && <Evidence m={m} active={active} onPick={setActive} />}
              {m.meta && (
                <p className="num mt-2 text-[10.5px] text-muted">
                  {m.meta.mode === "offline" ? t("assistant.offline") : m.meta.model} · {(m.meta.latency_ms / 1000).toFixed(1)}s
                </p>
              )}
            </div>
          ),
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex items-end gap-2 border-t hairline p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          rows={1}
          placeholder={assetId ? t("assistant.placeholder") : t("assistant.placeholder_global")}
          className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border hairline bg-surface px-3 py-2.5 text-[13.5px] outline-none focus:border-accent-ink"
        />
        {chat.busy ? (
          <button type="button" onClick={chat.stop} aria-label="Stop" className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-ink">
            <Square size={14} />
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()} aria-label="Send" className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-ink text-bg disabled:opacity-40">
            <ArrowUp size={16} />
          </button>
        )}
      </form>
    </section>
  );
}
