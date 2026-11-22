"use client";

// Contract calls signed in the browser. Amounts: kEUR has 6 decimals, share tokens have 0.
import { maxUint256, type Address, type WalletClient } from "viem";
import { foundry } from "viem/chains";
import { AssetGovernorAbi, AssetRegistryAbi, AssetTokenAbi, KEURAbi, MarketplaceAbi, OfferingAbi } from "@/lib/abi";
import { publicClient } from "@/lib/chain";

const E6 = BigInt(1_000_000);
const opts = (w: WalletClient) => ({ account: w.account!, chain: foundry });

async function ensureAllowance(w: WalletClient, keur: Address, spender: Address, amount: bigint) {
  const allowance = await publicClient.readContract({ address: keur, abi: KEURAbi, functionName: "allowance", args: [w.account!.address, spender] });
  if (allowance >= amount) return null;
  return w.writeContract({ ...opts(w), address: keur, abi: KEURAbi, functionName: "approve", args: [spender, maxUint256] });
}

export const actions = {
  invest: (keur: Address, offering: Address, shares: number, priceEur: number) => [
    async (w: WalletClient) => (await ensureAllowance(w, keur, offering, BigInt(shares) * BigInt(priceEur) * E6)) ?? (await noop(w)),
    (w: WalletClient) => w.writeContract({ ...opts(w), address: offering, abi: OfferingAbi, functionName: "invest", args: [BigInt(shares)] }),
  ],
  claimShares: (offering: Address) => [
    (w: WalletClient) => w.writeContract({ ...opts(w), address: offering, abi: OfferingAbi, functionName: "claimShares" }),
  ],
  refund: (offering: Address) => [
    (w: WalletClient) => w.writeContract({ ...opts(w), address: offering, abi: OfferingAbi, functionName: "refund" }),
  ],
  claimIncome: (tokens: Address[]) =>
    tokens.map((token) => (w: WalletClient) => w.writeContract({ ...opts(w), address: token, abi: AssetTokenAbi, functionName: "claimIncome" })),
  list: (market: Address, token: Address, shares: number, priceEur: number) => [
    async (w: WalletClient) => {
      const allowance = await publicClient.readContract({ address: token, abi: AssetTokenAbi, functionName: "allowance", args: [w.account!.address, market] });
      if (allowance >= BigInt(shares)) return noop(w);
      return w.writeContract({ ...opts(w), address: token, abi: AssetTokenAbi, functionName: "approve", args: [market, maxUint256] });
    },
    (w: WalletClient) =>
      w.writeContract({ ...opts(w), address: market, abi: MarketplaceAbi, functionName: "list", args: [token, BigInt(shares), BigInt(Math.round(priceEur * 1e6))] }),
  ],
  buy: (keur: Address, market: Address, listingId: number, shares: number, priceEur: number) => [
    async (w: WalletClient) => (await ensureAllowance(w, keur, market, BigInt(Math.round(shares * priceEur * 1e6)))) ?? (await noop(w)),
    (w: WalletClient) => w.writeContract({ ...opts(w), address: market, abi: MarketplaceAbi, functionName: "buy", args: [BigInt(listingId), BigInt(shares)] }),
  ],
  cancel: (market: Address, listingId: number) => [
    (w: WalletClient) => w.writeContract({ ...opts(w), address: market, abi: MarketplaceAbi, functionName: "cancel", args: [BigInt(listingId)] }),
  ],
  vote: (governor: Address, proposalId: number, support: 0 | 1 | 2) => [
    (w: WalletClient) => w.writeContract({ ...opts(w), address: governor, abi: AssetGovernorAbi, functionName: "castVote", args: [BigInt(proposalId), support] }),
  ],
  submitListing: (registry: Address, category: number, city: string, uri: string, valueEur: number) => [
    (w: WalletClient) =>
      w.writeContract({ ...opts(w), address: registry, abi: AssetRegistryAbi, functionName: "submitListing", args: [category, city, uri, BigInt(Math.round(valueEur)) * E6] }),
  ],
};

// A zero-value self transfer keeps step lists uniform when an approval is already in place.
async function noop(w: WalletClient) {
  return w.sendTransaction({ ...opts(w), to: w.account!.address, value: BigInt(0) });
}
