# Keystonia contracts

Solidity 0.8.31 (EVM `osaka`), OpenZeppelin 5, Foundry.

| Contract | Role |
| --- | --- |
| `KEUR.sol` | Test euro, 6 decimals, rate-limited faucet. Stands in for a regulated e-money token. |
| `IdentityRegistry.sol` | KYC registry: wallet → country, tier, expiry. Written by a `KYC_AGENT_ROLE`. |
| `AssetToken.sol` | One per asset. ERC-3643-style transfer compliance, rent distribution, snapshot votes. |
| `Offering.sol` | All-or-nothing primary sale with escrow, platform fee, claim or refund. |
| `Marketplace.sol` | Non-custodial secondary market (listings stay in the seller's wallet). |
| `AssetRegistry.sol` | Catalogue of listed assets, owner listing requests, valuations. |
| `AssetGovernor.sol` | Shareholder proposals and votes, one governor for every asset token. |

```bash
forge build
forge test -vv
forge coverage --report summary
```

Deployment and the 13-month history are produced by `backend/app/seed.py` (see the root README).
