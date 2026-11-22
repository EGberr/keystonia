"""Chain indexer: decodes every Keystonia event into SQLite so the API can answer instantly.

It scans all logs block by block (the local chain is small), decodes them by event signature using the
union of the contract ABIs, and stores them in typed tables keyed by contract address. Assets are linked to
their token and offering addresses through `AssetListed`, so events emitted before registration (such as
the issuer's initial mint) are still attributed once the asset is known.
"""

from __future__ import annotations

import logging
import sqlite3
import threading
import time
from contextlib import contextmanager
from typing import Any

from eth_utils import event_abi_to_log_topic
from hexbytes import HexBytes
from web3._utils.events import get_event_data

from app.chain import CONTRACTS, artifact, deployment, w3
from app.config import settings

log = logging.getLogger(__name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS identities (wallet TEXT PRIMARY KEY, country INT, tier INT, expires_at INT, ts INT);
CREATE TABLE IF NOT EXISTS assets (idx INT PRIMARY KEY, asset_id TEXT UNIQUE, token TEXT, offering TEXT, category INT,
  city TEXT, metadata_uri TEXT, valuation INT, request_id TEXT, ts INT);
CREATE TABLE IF NOT EXISTS requests (id INT PRIMARY KEY, owner TEXT, category INT, city TEXT, uri TEXT,
  status TEXT DEFAULT 'pending', note TEXT, ts INT, reviewed_ts INT);
CREATE TABLE IF NOT EXISTS transfers (token TEXT, frm TEXT, dst TEXT, value INT, block INT, ts INT, tx TEXT);
CREATE TABLE IF NOT EXISTS incomes (token TEXT, amount INT, period TEXT, block INT, ts INT, tx TEXT);
CREATE TABLE IF NOT EXISTS income_claims (token TEXT, holder TEXT, amount INT, ts INT, tx TEXT);
CREATE TABLE IF NOT EXISTS investments (offering TEXT, investor TEXT, shares INT, paid INT, ts INT, tx TEXT);
CREATE TABLE IF NOT EXISTS settlements (offering TEXT PRIMARY KEY, status INT, sold INT, raised INT, fee INT, ts INT);
CREATE TABLE IF NOT EXISTS share_claims (offering TEXT, investor TEXT, shares INT, ts INT);
CREATE TABLE IF NOT EXISTS refunds (offering TEXT, investor TEXT, amount INT, ts INT);
CREATE TABLE IF NOT EXISTS listings (id INT PRIMARY KEY, seller TEXT, token TEXT, shares INT, price INT, ts INT,
  remaining INT, cancelled INT DEFAULT 0);
CREATE TABLE IF NOT EXISTS trades (listing INT, token TEXT, seller TEXT, buyer TEXT, shares INT, price INT, fee INT,
  ts INT, tx TEXT);
CREATE TABLE IF NOT EXISTS proposals (id INT PRIMARY KEY, token TEXT, proposer TEXT, title TEXT, snapshot INT,
  deadline INT, executed INT DEFAULT 0, note TEXT, for_votes INT DEFAULT 0, against_votes INT DEFAULT 0,
  abstain_votes INT DEFAULT 0, ts INT);
CREATE TABLE IF NOT EXISTS votes (proposal INT, voter TEXT, support INT, weight INT, ts INT, tx TEXT);
CREATE INDEX IF NOT EXISTS ix_transfers_token ON transfers(token);
CREATE INDEX IF NOT EXISTS ix_transfers_dst ON transfers(dst);
CREATE INDEX IF NOT EXISTS ix_transfers_frm ON transfers(frm);
CREATE INDEX IF NOT EXISTS ix_investments_offering ON investments(offering);
CREATE INDEX IF NOT EXISTS ix_incomes_token ON incomes(token);
"""

REQUEST_STATUS = {0: "pending", 1: "approved", 2: "rejected"}
IGNORED = {
    "Approval",
    "RoleGranted",
    "RoleRevoked",
    "RoleAdminChanged",
    "DelegateChanged",
    "DelegateVotesChanged",
    "EIP712DomainChanged",
}


def _event_decoders() -> dict[bytes, tuple[str, dict]]:
    out: dict[bytes, tuple[str, dict]] = {}
    for name in CONTRACTS:
        for item in artifact(name)["abi"]:
            if item.get("type") == "event" and item["name"] not in IGNORED:
                out[bytes(event_abi_to_log_topic(item))] = (name, item)
    return out


class Indexer:
    def __init__(self, db_path=None) -> None:
        self.db_path = db_path or settings.db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        self.decoders = _event_decoders()
        self._block_ts: dict[int, int] = {}
        self._stop = threading.Event()
        self.deployed_block = 0
        self._check_deployment()

    def _check_deployment(self) -> None:
        """Drops the index when the chain was redeployed (different registry address)."""
        registry = deployment()["contracts"]["registry"].lower()
        if self.meta("registry") != registry:
            with self.tx() as c:
                for table in (
                    "identities",
                    "assets",
                    "requests",
                    "transfers",
                    "incomes",
                    "income_claims",
                    "investments",
                    "settlements",
                    "share_claims",
                    "refunds",
                    "listings",
                    "trades",
                    "proposals",
                    "votes",
                    "meta",
                ):
                    c.execute(f"DELETE FROM {table}")
                c.execute("INSERT OR REPLACE INTO meta VALUES ('registry', ?)", (registry,))

    # ── helpers ──────────────────────────────────────────────────────────────
    @contextmanager
    def tx(self):
        with self._lock:
            try:
                yield self.conn
                self.conn.commit()
            except Exception:
                self.conn.rollback()
                raise

    def query(self, sql: str, params: tuple | list = ()) -> list[dict[str, Any]]:
        with self._lock:
            return [dict(r) for r in self.conn.execute(sql, params).fetchall()]

    def one(self, sql: str, params: tuple | list = ()) -> dict[str, Any] | None:
        rows = self.query(sql, params)
        return rows[0] if rows else None

    def meta(self, key: str) -> str | None:
        row = self.conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
        return row[0] if row else None

    def _ts(self, block: int) -> int:
        if block not in self._block_ts:
            self._block_ts[block] = int(w3().eth.get_block(block)["timestamp"])
        return self._block_ts[block]

    # ── sync ─────────────────────────────────────────────────────────────────
    def sync(self, max_span: int = 2_000) -> int:
        """Indexes new blocks; returns the number of decoded events."""
        latest = w3().eth.block_number
        start = int(self.meta("last_block") or -1) + 1
        decoded = 0
        while start <= latest:
            end = min(latest, start + max_span - 1)
            logs = w3().eth.get_logs({"fromBlock": start, "toBlock": end})
            with self.tx() as c:
                for entry in logs:
                    decoded += self._handle(c, entry)
                c.execute("INSERT OR REPLACE INTO meta VALUES ('last_block', ?)", (str(end),))
            start = end + 1
        return decoded

    def _handle(self, c: sqlite3.Connection, entry) -> int:
        if not entry["topics"]:
            return 0
        found = self.decoders.get(bytes(entry["topics"][0]))
        if not found:
            return 0
        contract_name, abi = found
        try:
            ev = get_event_data(w3().codec, abi, entry)
        except Exception:  # noqa: BLE001 - same signature, different indexing (e.g. KEUR Transfer)
            return 0
        a = ev["args"]
        name = ev["event"]
        addr = entry["address"].lower()
        block = entry["blockNumber"]
        ts = self._ts(block)
        tx = HexBytes(entry["transactionHash"]).hex()
        lo = lambda x: x.lower()

        if name == "Transfer":
            c.execute(
                "INSERT INTO transfers VALUES (?,?,?,?,?,?,?)",
                (addr, lo(a["from"]), lo(a["to"]), int(a["value"]), block, ts, tx),
            )
        elif name == "IdentityRegistered":
            c.execute(
                "INSERT OR REPLACE INTO identities VALUES (?,?,?,?,?)",
                (lo(a["wallet"]), a["country"], a["tier"], a["expiresAt"], ts),
            )
        elif name == "IdentityRevoked":
            c.execute("DELETE FROM identities WHERE wallet = ?", (lo(a["wallet"]),))
        elif name == "AssetListed":
            asset_id = a["metadataURI"].rsplit("/", 1)[-1]
            c.execute(
                "INSERT OR REPLACE INTO assets VALUES (?,?,?,?,?,?,?,?,?,?)",
                (
                    a["assetIndex"],
                    asset_id,
                    lo(a["token"]),
                    lo(a["offering"]),
                    a["category"],
                    a["city"],
                    a["metadataURI"],
                    int(a["valuation"]),
                    str(a["requestId"]),
                    ts,
                ),
            )
        elif name == "ValuationUpdated":
            c.execute(
                "UPDATE assets SET valuation = ? WHERE idx = ?",
                (int(a["valuation"]), a["assetIndex"]),
            )
        elif name == "ListingRequested":
            c.execute(
                "INSERT OR REPLACE INTO requests (id, owner, category, city, uri, ts) VALUES (?,?,?,?,?,?)",
                (
                    a["requestId"],
                    lo(a["owner"]),
                    a["category"],
                    a["city"],
                    a["metadataURI"],
                    ts,
                ),
            )
        elif name == "ListingReviewed":
            c.execute(
                "UPDATE requests SET status = ?, note = ?, reviewed_ts = ? WHERE id = ?",
                (REQUEST_STATUS[a["status"]], a["note"], ts, a["requestId"]),
            )
        elif name == "IncomeDistributed":
            c.execute(
                "INSERT INTO incomes VALUES (?,?,?,?,?,?)",
                (addr, int(a["amount"]), a["period"], block, ts, tx),
            )
        elif name == "IncomeClaimed":
            c.execute(
                "INSERT INTO income_claims VALUES (?,?,?,?,?)",
                (addr, lo(a["holder"]), int(a["amount"]), ts, tx),
            )
        elif name == "Invested":
            c.execute(
                "INSERT INTO investments VALUES (?,?,?,?,?,?)",
                (addr, lo(a["investor"]), int(a["shares"]), int(a["paid"]), ts, tx),
            )
        elif name == "Finalized":
            c.execute(
                "INSERT OR REPLACE INTO settlements VALUES (?,?,?,?,?,?)",
                (
                    addr,
                    a["status"],
                    int(a["sharesSold"]),
                    int(a["raised"]),
                    int(a["fee"]),
                    ts,
                ),
            )
        elif name == "SharesClaimed":
            c.execute(
                "INSERT INTO share_claims VALUES (?,?,?,?)",
                (addr, lo(a["investor"]), int(a["shares"]), ts),
            )
        elif name == "Refunded":
            c.execute(
                "INSERT INTO refunds VALUES (?,?,?,?)",
                (addr, lo(a["investor"]), int(a["amount"]), ts),
            )
        elif name == "Listed":
            c.execute(
                "INSERT OR REPLACE INTO listings (id, seller, token, shares, price, ts, remaining) "
                "VALUES (?,?,?,?,?,?,?)",
                (
                    a["id"],
                    lo(a["seller"]),
                    lo(a["token"]),
                    int(a["shares"]),
                    int(a["price"]),
                    ts,
                    int(a["shares"]),
                ),
            )
        elif name == "Cancelled":
            c.execute("UPDATE listings SET cancelled = 1 WHERE id = ?", (a["id"],))
        elif name == "Trade":
            c.execute(
                "INSERT INTO trades VALUES (?,?,?,?,?,?,?,?,?)",
                (
                    a["id"],
                    lo(a["token"]),
                    lo(a["seller"]),
                    lo(a["buyer"]),
                    int(a["shares"]),
                    int(a["pricePerShare"]),
                    int(a["fee"]),
                    ts,
                    tx,
                ),
            )
            c.execute(
                "UPDATE listings SET remaining = remaining - ? WHERE id = ?",
                (int(a["shares"]), a["id"]),
            )
        elif name == "ProposalCreated":
            c.execute(
                "INSERT OR REPLACE INTO proposals (id, token, proposer, title, snapshot, deadline, ts) "
                "VALUES (?,?,?,?,?,?,?)",
                (
                    a["id"],
                    lo(a["token"]),
                    lo(a["proposer"]),
                    a["title"],
                    a["snapshot"],
                    a["deadline"],
                    ts,
                ),
            )
        elif name == "VoteCast":
            col = {0: "against_votes", 1: "for_votes", 2: "abstain_votes"}[a["support"]]
            c.execute(
                f"UPDATE proposals SET {col} = {col} + ? WHERE id = ?",
                (int(a["weight"]), a["id"]),
            )
            c.execute(
                "INSERT INTO votes VALUES (?,?,?,?,?,?)",
                (a["id"], lo(a["voter"]), a["support"], int(a["weight"]), ts, tx),
            )
        elif name == "ProposalExecuted":
            c.execute(
                "UPDATE proposals SET executed = 1, note = ? WHERE id = ?",
                (a["note"], a["id"]),
            )
        else:
            return 0
        _ = contract_name
        return 1

    # ── background loop ──────────────────────────────────────────────────────
    def start(self, interval: float = 1.0) -> threading.Thread:
        def loop() -> None:
            while not self._stop.is_set():
                try:
                    self.sync()
                except Exception as exc:  # noqa: BLE001 - keep serving the last good index
                    log.warning("indexer sync failed: %s", exc)
                self._stop.wait(interval)

        t = threading.Thread(target=loop, name="indexer", daemon=True)
        t.start()
        return t

    def stop(self) -> None:
        self._stop.set()


_indexer: Indexer | None = None


def get_indexer() -> Indexer:
    global _indexer
    if _indexer is None:
        _indexer = Indexer()
    return _indexer


if __name__ == "__main__":
    t0 = time.perf_counter()
    n = get_indexer().sync()
    print(f"indexed {n} events in {time.perf_counter() - t0:.1f}s")
