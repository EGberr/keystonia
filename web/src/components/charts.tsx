"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { ChartSpec } from "@/lib/api";
import { CHART_COLORS, cx } from "@/lib/format";

const AXIS = { fontSize: 11, fill: "var(--muted)" };
const axisFmt = (unit: string) => (v: number) => (unit.startsWith("EUR") ? `€${Math.round(v)}` : unit === "%" ? `${Math.round(v)}%` : `${v}`);

export function fmtValue(v: number, unit: string) {
  if (unit.startsWith("EUR")) return `€${v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
  if (unit === "%") return `${v.toFixed(v < 10 ? 1 : 0)}%`;
  if (unit === "" && Math.abs(v) < 1) return v.toFixed(3);
  return `${v.toLocaleString("en-GB", { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ""}`;
}

type TooltipPayload = { name?: string; value?: number; color?: string; payload?: Record<string, unknown> };

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: TooltipPayload[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border hairline bg-surface px-3 py-2 text-xs shadow-card">
      {label && <p className="mb-1 font-medium text-ink">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-ink-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="num ml-auto pl-3 font-medium text-ink">{fmtValue(Number(p.value), unit)}</span>
        </div>
      ))}
    </div>
  );
}

/** Ranked horizontal bars rendered in plain HTML — crisp, accessible and theme-aware. */
export function BarList({
  data,
  unit = "%",
  color = "var(--chart-1)",
  max,
  highlightFirst = true,
}: {
  data: { label: string; value: number; hint?: string }[];
  unit?: string;
  color?: string;
  max?: number;
  highlightFirst?: boolean;
}) {
  const top = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((d, i) => (
        <li key={d.label} className="text-[13px]">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className={cx("truncate", i === 0 && highlightFirst ? "font-medium text-ink" : "text-ink-2")}>{d.label}</span>
            <span className="num shrink-0 text-ink">{fmtValue(d.value, unit)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${Math.max((d.value / top) * 100, 1.5)}%`, background: color, opacity: i === 0 || !highlightFirst ? 1 : 0.55 }}
            />
          </div>
          {d.hint && <p className="mt-0.5 text-[11px] text-muted">{d.hint}</p>}
        </li>
      ))}
    </ul>
  );
}

export function Donut({ data, unit = "%", height = 220 }: { data: { label: string; value: number }[]; unit?: string; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col items-center gap-5 2xl:flex-row">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="64%" outerRadius="96%" paddingAngle={2} stroke="none" isAnimationActive>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip unit={unit} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-2xl font-semibold">{fmtValue(data[0]?.value ?? 0, unit)}</span>
          <span className="max-w-[60%] truncate text-center text-[11px] text-muted">{data[0]?.label}</span>
        </div>
      </div>
      <ul className="flex w-full min-w-0 flex-col gap-1.5 text-[13px]">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="truncate text-ink-2">{d.label}</span>
            <span className="num ml-auto text-ink">{unit === "%" && total ? fmtValue(d.value, unit) : fmtValue(d.value, unit)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Columns({ data, unit = "%", height = 220, color = "var(--chart-1)" }: { data: { label: string; value: number }[]; unit?: string; height?: number; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={axisFmt(unit)} width={52} />
        <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<ChartTooltip unit={unit} />} />
        <Bar dataKey="value" name="Value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GroupedColumns({ data, unit = "%", height = 260 }: { data: { label: string; value: number; series?: string | null }[]; unit?: string; height?: number }) {
  const series = Array.from(new Set(data.map((d) => d.series ?? "Value")));
  const labels = Array.from(new Set(data.map((d) => d.label)));
  const rows = labels.map((label) => {
    const row: Record<string, string | number> = { label };
    for (const d of data.filter((x) => x.label === label)) row[d.series ?? "Value"] = d.value;
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={axisFmt(unit)} width={52} />
        <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<ChartTooltip unit={unit} />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
        {series.map((s, i) => (
          <Bar key={s} dataKey={s} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[5, 5, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ChartFromSpec({ spec }: { spec: ChartSpec }) {
  const data = spec.data.map((d) => ({ label: d.label, value: d.value, series: d.series }));
  return (
    <figure className="card p-5">
      <figcaption className="mb-4 flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-ink">{spec.title}</span>
        <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">
          {spec.id}
          {spec.source_ids.length ? ` · ${spec.source_ids.join(", ")}` : ""}
        </span>
      </figcaption>
      {spec.chart_type === "donut" ? (
        <Donut data={data} unit={spec.unit} height={180} />
      ) : spec.chart_type === "grouped_bar" ? (
        <GroupedColumns data={data} unit={spec.unit} />
      ) : spec.chart_type === "horizontal_bar" || data.length > 7 ? (
        <BarList data={[...data].sort((a, b) => b.value - a.value)} unit={spec.unit} />
      ) : (
        <Columns data={data} unit={spec.unit} />
      )}
    </figure>
  );
}

export function OpportunityMap({
  data,
  onSelect,
}: {
  data: { slug: string; name: string; group_name: string; x: number; y: number; z: number; color: string }[];
  onSelect?: (slug: string) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <ScatterChart margin={{ top: 12, right: 16, left: -8, bottom: 8 }}>
        <CartesianGrid stroke="var(--chart-grid)" />
        <XAxis type="number" dataKey="x" name="Penetration" unit="%" tick={AXIS} tickLine={false} axisLine={false} domain={[10, 85]} />
        <YAxis type="number" dataKey="y" name="Growth" unit="%" tick={AXIS} tickLine={false} axisLine={false} domain={[-8, 24]} />
        <ZAxis type="number" dataKey="z" range={[90, 1500]} name="Annual spend" />
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: "var(--border-strong)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as (typeof data)[number];
            return (
              <div className="rounded-xl border hairline bg-surface px-3 py-2 text-xs shadow-card">
                <p className="font-medium text-ink">{p.name}</p>
                <p className="text-muted">{p.group_name}</p>
                <p className="num mt-1 text-ink-2">
                  {p.x.toFixed(0)}% penetration · {p.y > 0 ? "+" : ""}
                  {p.y.toFixed(1)}% growth · €{p.z.toFixed(0)}/yr
                </p>
              </div>
            );
          }}
        />
        <Scatter data={data} onClick={(d) => onSelect?.((d as unknown as { slug: string }).slug)} className="cursor-pointer">
          {data.map((d) => (
            <Cell key={d.slug} fill={d.color} fillOpacity={0.75} stroke={d.color} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export function CompareRadar({ data, series }: { data: Record<string, number | string>[]; series: { key: string; name: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--chart-grid)" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "var(--muted)" }} />
        {series.map((s, i) => (
          <Radar key={s.key} name={s.name} dataKey={s.key} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.14} strokeWidth={2} />
        ))}
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Tooltip content={<ChartTooltip unit="%" />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
