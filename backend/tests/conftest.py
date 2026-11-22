"""Shared fixtures. Integration tests need the local chain (scripts/reset-chain.sh) and are skipped without it."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

import httpx
import pytest

# Index into a throwaway database so tests never touch the developer's running API, and keep the
# assistant offline so tests are deterministic and free.
os.environ.setdefault("KST_DB_PATH", str(Path(tempfile.mkdtemp()) / "index.sqlite"))
os.environ["KST_OFFLINE"] = "true"


def _chain_up() -> bool:
    try:
        r = httpx.post(
            os.environ.get("KST_RPC_URL", "http://127.0.0.1:8545"),
            json={"jsonrpc": "2.0", "id": 1, "method": "eth_blockNumber", "params": []},
            timeout=1.0,
        )
        return int(r.json()["result"], 16) > 100
    except Exception:
        return False


CHAIN_UP = _chain_up()
needs_chain = pytest.mark.skipif(not CHAIN_UP, reason="local chain not running (scripts/reset-chain.sh)")


@pytest.fixture(scope="session")
def client():
    if not CHAIN_UP:
        pytest.skip("local chain not running")
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c
