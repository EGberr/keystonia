"use client";

import { useSyncExternalStore } from "react";

// Progress of the guided demo (verify → buy → next month → collect rent), kept in localStorage.
export type TourStep = "invest" | "month" | "claim";
const KEY = "keystonia-tour";
const listeners = new Set<() => void>();
let cache: string | null = null;

function read(): string {
  if (cache === null) {
    try {
      cache = localStorage.getItem(KEY) ?? "";
    } catch {
      cache = "";
    }
  }
  return cache;
}
function write(v: string) {
  cache = v;
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function tourMark(step: TourStep) {
  const cur = read().split(",").filter(Boolean);
  if (!cur.includes(step)) write([...cur, step].join(","));
}
export function tourSet(flag: "open" | "closed") {
  const cur = read().split(",").filter((x) => x && x !== "open" && x !== "closed");
  write([...cur, flag].join(","));
}
export function tourReset() {
  write("open");
}
export function useTour() {
  const raw = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "",
  );
  const set = new Set(raw.split(",").filter(Boolean));
  return { done: (s: TourStep) => set.has(s), open: set.has("open"), closed: set.has("closed") };
}
