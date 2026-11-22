#!/usr/bin/env bash
# Starts the local demo chain from its saved state (run reset-chain.sh once first).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f data/chain/state.json ] || { echo "No saved chain: run scripts/reset-chain.sh first"; exit 1; }
exec anvil --accounts 40 --balance 10000 --state data/chain/state.json --silent
