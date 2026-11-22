#!/usr/bin/env bash
# Recreates the local demo chain from scratch: fresh Anvil (genesis 400 days ago) + full history replay.
set -euo pipefail
cd "$(dirname "$0")/.."
pkill -f "anvil --accounts 40" 2>/dev/null || true
sleep 1
rm -f data/chain/state.json data/chain/index.sqlite
anvil --accounts 40 --balance 10000 --timestamp $(( $(date +%s) - 400*86400 )) \
  --state data/chain/state.json --silent &
until curl -s -X POST -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' localhost:8545 >/dev/null; do sleep 0.5; done
(cd backend && uv run python -m app.seed)
echo "Chain ready on http://127.0.0.1:8545 (state persists in data/chain/state.json)."
