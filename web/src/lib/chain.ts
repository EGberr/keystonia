"use client";

// Wallet + transaction layer. Demo profiles sign locally with Anvil's public development mnemonic
// (local test network only); a browser wallet (MetaMask...) can be used instead.
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hash,
  type WalletClient,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { STATIC } from "@/lib/demo";

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545";
// Anvil's well-known development mnemonic. Public test keys: never use them on a real network.
const DEV_MNEMONIC = "test test test test test test test test test test test junk";
export const DEMO_INDEX = 10;

export const publicClient = createPublicClient({ chain: foundry, transport: http(RPC_URL), pollingInterval: 400 });

type WalletState = { kind: "demo"; index: number } | { kind: "injected"; address: Address };
const STORAGE_KEY = "keystonia-wallet";
const listeners = new Set<() => void>();
let state: WalletState | null = null;

function read(): WalletState {
  if (state) return state;
  let s: WalletState = { kind: "demo", index: DEMO_INDEX };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) s = JSON.parse(raw) as WalletState;
  } catch {
    /* ignore */
  }
  state = s;
  return s;
}

function write(s: WalletState) {
  state = s;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

/** Address of the active wallet, outside React (used by the static demo's simulated transactions). */
export function currentAddress(): Address {
  const s = read();
  return s.kind === "demo" ? demoAccount(s.index).address : s.address;
}

const SERVER_STATE: WalletState = { kind: "demo", index: DEMO_INDEX };
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const accountCache = new Map<number, ReturnType<typeof mnemonicToAccount>>();
export function demoAccount(index: number) {
  if (!accountCache.has(index)) accountCache.set(index, mnemonicToAccount(DEV_MNEMONIC, { addressIndex: index }));
  return accountCache.get(index)!;
}

export function useWallet() {
  const s = useSyncExternalStore(subscribe, read, () => SERVER_STATE);
  const address: Address = s.kind === "demo" ? demoAccount(s.index).address : s.address;
  return {
    state: s,
    address,
    isDemo: s.kind === "demo",
    useDemo: (index: number) => write({ kind: "demo", index }),
    connectInjected: async () => {
      const eth = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
      if (!eth) throw new Error("No browser wallet found");
      const [addr] = (await eth.request({ method: "eth_requestAccounts" })) as Address[];
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x7a69" }] });
      } catch {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{ chainId: "0x7a69", chainName: "Keystonia local", rpcUrls: [RPC_URL], nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 } }],
        });
      }
      write({ kind: "injected", address: addr });
    },
  };
}

export function walletClient(s: WalletState): WalletClient {
  if (s.kind === "demo") return createWalletClient({ account: demoAccount(s.index), chain: foundry, transport: http(RPC_URL) });
  const eth = (window as unknown as { ethereum: Parameters<typeof custom>[0] }).ethereum;
  return createWalletClient({ account: s.address, chain: foundry, transport: custom(eth) });
}

// ── chain version: bumps after each confirmed transaction so data hooks refetch ──
let version = 0;
const versionListeners = new Set<() => void>();
export function bumpChain(delayMs = 1300) {
  setTimeout(() => {
    version += 1;
    versionListeners.forEach((l) => l());
  }, delayMs);
}
export function useChainVersion() {
  return useSyncExternalStore(
    (cb) => {
      versionListeners.add(cb);
      return () => versionListeners.delete(cb);
    },
    () => version,
    () => 0,
  );
}

// ── toasts ──
export type Toast = { id: number; title: string; status: "pending" | "success" | "error"; detail?: string; hash?: Hash };
let toasts: Toast[] = [];
const toastListeners = new Set<() => void>();
let toastId = 0;
function setToasts(next: Toast[]) {
  toasts = next;
  toastListeners.forEach((l) => l());
}
const NO_TOASTS: Toast[] = [];
export function useToasts() {
  return useSyncExternalStore(
    (cb) => {
      toastListeners.add(cb);
      return () => toastListeners.delete(cb);
    },
    () => toasts,
    () => NO_TOASTS,
  );
}
export function dismissToast(id: number) {
  setToasts(toasts.filter((t) => t.id !== id));
}

/** Runs a sequence of transactions with a single toast; returns true on success. */
export async function runTx(title: string, steps: ((w: WalletClient) => Promise<Hash>)[], s: WalletState, success: string) {
  const id = ++toastId;
  setToasts([...toasts, { id, title, status: "pending" }]);
  try {
    let hash: Hash | undefined;
    if (STATIC) {
      // Static demo: steps are simulated in the browser; a short delay mimics block confirmation.
      for (const step of steps) hash = await step(null as unknown as WalletClient);
      await new Promise((r) => setTimeout(r, 700));
    } else {
      const w = walletClient(s);
      for (const step of steps) {
        hash = await step(w);
        const r = await publicClient.waitForTransactionReceipt({ hash });
        if (r.status !== "success") throw new Error("reverted");
      }
    }
    setToasts(toasts.map((t) => (t.id === id ? { ...t, status: "success", title: success, hash } : t)));
    bumpChain();
    setTimeout(() => dismissToast(id), 6000);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? (e.message.split("\n").find((l) => /reverted|error|Error:/.test(l)) ?? e.message.split("\n")[0]) : String(e);
    setToasts(toasts.map((t) => (t.id === id ? { ...t, status: "error", detail: msg.slice(0, 160) } : t)));
    setTimeout(() => dismissToast(id), 9000);
    return false;
  }
}

/** Runs an operator-side demo action (KYC desk, faucet, clock) with the same toast flow as a transaction. */
export async function demoCall(title: string, fn: () => Promise<unknown>, success: string) {
  const id = ++toastId;
  setToasts([...toasts, { id, title, status: "pending" }]);
  try {
    await fn();
    setToasts(toasts.map((t) => (t.id === id ? { ...t, status: "success", title: success } : t)));
    bumpChain();
    setTimeout(() => dismissToast(id), 5000);
    return true;
  } catch (e) {
    setToasts(toasts.map((t) => (t.id === id ? { ...t, status: "error", detail: String(e).slice(0, 160) } : t)));
    setTimeout(() => dismissToast(id), 9000);
    return false;
  }
}

/** Fetches API data and refetches after every confirmed transaction (and optionally on an interval). */
export function useApi<T>(key: string | null, fetcher: () => Promise<T>, pollMs?: number) {
  const v = useChainVersion();
  const [state, setState] = useState<{ key: string; data?: T; error?: string } | null>(null);
  useEffect(() => {
    if (!key) return;
    let live = true;
    const load = () =>
      fetcher()
        .then((data) => live && setState({ key, data }))
        .catch((e) => live && setState((prev) => (prev?.key === key && prev.data ? prev : { key, error: String(e) })));
    load();
    const t = pollMs ? setInterval(load, pollMs) : undefined;
    return () => {
      live = false;
      if (t) clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, v, pollMs]);
  const ok = state?.key === key;
  return { data: ok ? state?.data : undefined, error: ok ? state?.error : undefined };
}
