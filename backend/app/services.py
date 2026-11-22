"""Read models for the API: catalogue + indexed chain data + a few live contract calls."""

from __future__ import annotations

import json
from collections import defaultdict
from functools import lru_cache
from typing import Any

from app.chain import chain_time, contract, core, deployment
from app.config import settings
from app.indexer import Indexer

E6 = 10**6
ZERO = "0x0000000000000000000000000000000000000000"
OFFERING_STATUS = {0: "active", 1: "succeeded", 2: "failed"}
PROPOSAL_STATE = {0: "active", 1: "defeated", 2: "succeeded", 3: "executed"}


@lru_cache
def catalog() -> list[dict[str, Any]]:
    return json.loads((settings.catalog_dir / "assets.json").read_text())


@lru_cache
def cities() -> dict[str, Any]:
    return json.loads((settings.catalog_dir / "cities.json").read_text())


@lru_cache
def categories() -> dict[str, Any]:
    return json.loads((settings.catalog_dir / "categories.json").read_text())


@lru_cache
def accounts() -> dict[str, dict[str, Any]]:
    return {k.lower(): v for k, v in deployment()["accounts"].items()}


def person(wallet: str) -> dict[str, Any]:
    info = accounts().get(wallet.lower())
    return {
        "address": wallet,
        "name": info["name"] if info else None,
        "role": info["role"] if info else "external",
    }


class Platform:
    def __init__(self, ix: Indexer) -> None:
        self.ix = ix

    # ── assets ───────────────────────────────────────────────────────────────
    def _onchain(self) -> dict[str, dict[str, Any]]:
        rows = self.ix.query("SELECT * FROM assets")
        return {r["asset_id"]: r for r in rows}

    def asset_stats(self) -> dict[str, dict[str, Any]]:
        onchain = self._onchain()
        inv = {
            r["offering"]: r
            for r in self.ix.query(
                "SELECT offering, SUM(shares) AS sold, COUNT(DISTINCT investor) AS investors, MAX(ts) AS last "
                "FROM investments GROUP BY offering"
            )
        }
        settled = {r["offering"]: r for r in self.ix.query("SELECT * FROM settlements")}
        income = {
            r["token"]: r
            for r in self.ix.query(
                "SELECT token, SUM(amount) AS total, COUNT(*) AS months, MAX(ts) AS last FROM incomes GROUP BY token"
            )
        }
        last_trade = {
            r["token"]: r
            for r in self.ix.query(
                "SELECT token, price, ts FROM trades t WHERE ts = (SELECT MAX(ts) FROM trades WHERE token = t.token)"
            )
        }
        holders = {
            r["token"]: r["n"]
            for r in self.ix.query(
                "SELECT token, COUNT(*) AS n FROM (SELECT token, holder, SUM(delta) AS bal FROM ("
                "  SELECT token, dst AS holder, value AS delta FROM transfers"
                "  UNION ALL SELECT token, frm AS holder, -value AS delta FROM transfers WHERE frm != ?"
                ") GROUP BY token, holder HAVING bal > 0) GROUP BY token",
                (ZERO,),
            )
        }
        now = chain_time()
        dep = deployment()["assets"]
        out = {}
        for a in catalog():
            oc = onchain.get(a["id"])
            meta = dep.get(a["id"], {})
            offering = (oc or {}).get("offering", "")
            i = inv.get(offering, {})
            s = settled.get(offering)
            sold = int(i.get("sold") or 0)
            starts, ends = meta.get("startsAt", 0), meta.get("endsAt", 0)
            if s:
                phase = "funded" if s["status"] == 1 else "refunded"
            elif now < starts:
                phase = "upcoming"
            elif now < ends:
                phase = "live"
            else:
                phase = "closing"
            token = (oc or {}).get("token", "")
            t = last_trade.get(token)
            inc = income.get(token, {})
            out[a["id"]] = {
                "listed": bool(oc),
                "token": token,
                "offering": offering,
                "phase": phase,
                "shares_sold": sold,
                "progress_pct": round(sold / a["offered_shares"] * 100, 1) if a["offered_shares"] else 0,
                "raised_eur": sold * a["share_price_eur"],
                "investors": int(i.get("investors") or 0),
                "holders": holders.get(token, 0),
                "starts_at": starts,
                "ends_at": ends,
                "income_distributed_eur": round((inc.get("total") or 0) / E6, 2),
                "income_months": inc.get("months") or 0,
                "last_trade_price_eur": round(t["price"] / E6, 2) if t else None,
                "last_trade_at": t["ts"] if t else None,
            }
        return out

    def assets(
        self,
        city: str | None = None,
        category: str | None = None,
        phase: str | None = None,
    ):
        stats = self.asset_stats()
        items = []
        for a in catalog():
            s = stats[a["id"]]
            if city and a["city"] != city:
                continue
            if category and a["category"] != category:
                continue
            if phase and s["phase"] != phase:
                continue
            items.append({**a, **s})
        return items

    def asset(self, asset_id: str) -> dict[str, Any] | None:
        base = next((a for a in catalog() if a["id"].lower() == asset_id.lower()), None)
        if not base:
            return None
        s = self.asset_stats()[base["id"]]
        token, offering = s["token"], s["offering"]
        incomes = self.ix.query(
            "SELECT period, amount, ts, tx FROM incomes WHERE token = ? ORDER BY ts",
            (token,),
        )
        investments = self.ix.query(
            "SELECT investor, shares, paid, ts, tx FROM investments WHERE offering = ? ORDER BY ts",
            (offering,),
        )
        listings = self.ix.query(
            "SELECT * FROM listings WHERE token = ? AND cancelled = 0 AND remaining > 0 ORDER BY price",
            (token,),
        )
        trades = self.ix.query("SELECT * FROM trades WHERE token = ? ORDER BY ts DESC LIMIT 50", (token,))
        balances = self.ix.query(
            "SELECT holder, SUM(delta) AS shares FROM ("
            " SELECT dst AS holder, value AS delta FROM transfers WHERE token = ?"
            " UNION ALL SELECT frm AS holder, -value AS delta FROM transfers WHERE token = ? AND frm != ?"
            ") GROUP BY holder HAVING shares > 0 ORDER BY shares DESC",
            (token, token, ZERO),
        )
        issuer = deployment()["assets"].get(base["id"], {}).get("issuer", "").lower()
        cumulative = 0.0
        income_series = []
        for r in incomes:
            cumulative += r["amount"] / E6
            income_series.append(
                {
                    "period": r["period"],
                    "amount_eur": round(r["amount"] / E6, 2),
                    "cumulative_eur": round(cumulative, 2),
                    "ts": r["ts"],
                    "tx": r["tx"],
                }
            )
        funding_curve = []
        running = 0
        for r in investments:
            running += r["shares"]
            funding_curve.append(
                {
                    "ts": r["ts"],
                    "shares": running,
                    "pct": round(running / base["offered_shares"] * 100, 2),
                }
            )
        return {
            **base,
            **s,
            "income_history": income_series,
            "funding_curve": funding_curve,
            "recent_investments": [
                {**r, "paid_eur": r["paid"] / E6, "who": person(r["investor"])["name"]} for r in investments[-12:][::-1]
            ],
            "order_book": [
                {
                    "id": r["id"],
                    "seller": r["seller"],
                    "seller_name": person(r["seller"])["name"],
                    "shares": r["remaining"],
                    "price_eur": r["price"] / E6,
                    "listed_at": r["ts"],
                }
                for r in listings
            ],
            "trades": [
                {
                    "shares": r["shares"],
                    "price_eur": r["price"] / E6,
                    "ts": r["ts"],
                    "tx": r["tx"],
                    "buyer": person(r["buyer"])["name"],
                    "seller": person(r["seller"])["name"],
                }
                for r in trades
            ],
            "cap_table": [
                {
                    "holder": r["holder"],
                    "name": person(r["holder"])["name"],
                    "shares": r["shares"],
                    "pct": round(r["shares"] / base["total_shares"] * 100, 2),
                    "is_issuer": r["holder"] == issuer,
                }
                for r in balances[:15]
            ],
            "proposals": self.proposals(token=token),
            "documents": ["memorandum", "valuation", "technical", "legal"],
        }

    def document(self, asset_id: str, kind: str) -> str | None:
        path = settings.catalog_dir / "docs" / asset_id.upper() / f"{kind}.md"
        return path.read_text() if path.exists() else None

    # ── platform ─────────────────────────────────────────────────────────────
    def overview(self) -> dict[str, Any]:
        items = self.assets()
        funded = [a for a in items if a["phase"] == "funded"]
        investors = self.ix.one("SELECT COUNT(DISTINCT investor) AS n FROM investments")["n"]
        volume = self.ix.one("SELECT COALESCE(SUM(shares * price), 0) AS v FROM trades")["v"] / E6
        income = sum(a["income_distributed_eur"] for a in items)
        raised = sum(a["raised_eur"] for a in items)
        by_city = defaultdict(lambda: {"assets": 0, "value_eur": 0})
        for a in items:
            by_city[a["city"]]["assets"] += 1
            by_city[a["city"]]["value_eur"] += a["valuation_eur"]
        return {
            "assets": len(items),
            "tokenized_value_eur": sum(a["valuation_eur"] for a in items),
            "raised_eur": raised,
            "income_distributed_eur": round(income, 2),
            "investors": investors,
            "secondary_volume_eur": round(volume, 2),
            "funded_assets": len(funded),
            "live_offerings": sum(1 for a in items if a["phase"] == "live"),
            "avg_net_yield_pct": round(sum(a["net_yield_pct"] for a in funded) / max(len(funded), 1), 2),
            "cities": [{"id": k, **v, **by_city[k]} for k, v in cities().items()],
            "categories": [
                {"id": k, **v, "assets": sum(1 for a in items if a["category"] == k)} for k, v in categories().items()
            ],
            "chain_time": chain_time(),
            "block": self.ix.meta("last_block"),
        }

    def activity(self, limit: int = 40) -> list[dict[str, Any]]:
        by_offering = {r["offering"]: r["asset_id"] for r in self.ix.query("SELECT asset_id, offering FROM assets")}
        by_token = {r["token"]: r["asset_id"] for r in self.ix.query("SELECT asset_id, token FROM assets")}
        names = {a["id"]: a["name"] for a in catalog()}
        rows = self.ix.query(
            "SELECT 'invest' AS kind, offering AS ref, investor AS who, shares AS amount, paid AS value, ts, tx "
            "FROM investments UNION ALL "
            "SELECT 'trade', token, buyer, shares, shares * price, ts, tx FROM trades UNION ALL "
            "SELECT 'income', token, NULL, NULL, amount, ts, tx FROM incomes UNION ALL "
            "SELECT 'vote', p.token, v.voter, v.weight, v.support, v.ts, v.tx FROM votes v "
            "JOIN proposals p ON p.id = v.proposal "
            "ORDER BY ts DESC LIMIT ?",
            (limit,),
        )
        out = []
        for r in rows:
            asset_id = by_offering.get(r["ref"]) or by_token.get(r["ref"])
            out.append(
                {
                    "kind": r["kind"],
                    "asset_id": asset_id,
                    "asset_name": names.get(asset_id),
                    "who": person(r["who"])["name"] if r["who"] else None,
                    "shares": r["amount"],
                    "value_eur": (r["value"] / E6) if r["kind"] != "vote" else None,
                    "support": r["value"] if r["kind"] == "vote" else None,
                    "ts": r["ts"],
                    "tx": r["tx"],
                }
            )
        return out

    def market(self) -> dict[str, Any]:
        by_token = {r["token"]: r["asset_id"] for r in self.ix.query("SELECT asset_id, token FROM assets")}
        cat = {a["id"]: a for a in catalog()}
        listings = self.ix.query("SELECT * FROM listings WHERE cancelled = 0 AND remaining > 0 ORDER BY ts DESC")
        trades = self.ix.query("SELECT * FROM trades ORDER BY ts DESC LIMIT 60")

        def enrich(r: dict) -> dict:
            a = cat.get(by_token.get(r["token"]), {})
            return {
                "asset_id": a.get("id"),
                "asset_name": a.get("name"),
                "asset_name_fr": a.get("name_fr"),
                "city_name": a.get("city_name"),
                "image": (a.get("images") or [None])[0],
                "share_price_eur": a.get("share_price_eur"),
            }

        return {
            "listings": [
                {
                    **enrich(r),
                    "id": r["id"],
                    "seller": r["seller"],
                    "seller_name": person(r["seller"])["name"],
                    "shares": r["remaining"],
                    "price_eur": r["price"] / E6,
                    "ts": r["ts"],
                    "premium_pct": round((r["price"] / E6 / enrich(r)["share_price_eur"] - 1) * 100, 2)
                    if enrich(r)["share_price_eur"]
                    else None,
                }
                for r in listings
            ],
            "trades": [
                {
                    **enrich(r),
                    "shares": r["shares"],
                    "price_eur": r["price"] / E6,
                    "ts": r["ts"],
                    "buyer": person(r["buyer"])["name"],
                    "seller": person(r["seller"])["name"],
                    "tx": r["tx"],
                }
                for r in trades
            ],
        }

    def proposals(self, token: str | None = None) -> list[dict[str, Any]]:
        rows = self.ix.query(
            "SELECT * FROM proposals" + (" WHERE token = ?" if token else "") + " ORDER BY ts DESC",
            (token,) if token else (),
        )
        by_token = {r["token"]: r["asset_id"] for r in self.ix.query("SELECT asset_id, token FROM assets")}
        cat = {a["id"]: a for a in catalog()}
        gov = core("governor")
        out = []
        for r in rows:
            a = cat.get(by_token.get(r["token"]), {})
            supply = a.get("total_shares", 1)
            turnout = r["for_votes"] + r["against_votes"] + r["abstain_votes"]
            out.append(
                {
                    "id": r["id"],
                    "asset_id": a.get("id"),
                    "asset_name": a.get("name"),
                    "title": r["title"],
                    "proposer": person(r["proposer"])["name"],
                    "snapshot": r["snapshot"],
                    "deadline": r["deadline"],
                    "state": PROPOSAL_STATE[gov.functions.state(r["id"]).call()],
                    "for": r["for_votes"],
                    "against": r["against_votes"],
                    "abstain": r["abstain_votes"],
                    "turnout_pct": round(turnout / supply * 100, 2),
                    "quorum_pct": 20,
                    "note": r["note"],
                    "created_at": r["ts"],
                }
            )
        return out

    def requests(self) -> list[dict[str, Any]]:
        cats = list(categories())
        return [
            {
                **r,
                "owner_name": person(r["owner"])["name"],
                "category": cats[r["category"]],
            }
            for r in self.ix.query("SELECT * FROM requests ORDER BY ts DESC")
        ]

    # ── portfolio ────────────────────────────────────────────────────────────
    def portfolio(self, wallet: str) -> dict[str, Any]:
        w = wallet.lower()
        cat = {a["id"]: a for a in catalog()}
        assets = self.ix.query("SELECT asset_id, token, offering FROM assets")
        identity = self.ix.one("SELECT * FROM identities WHERE wallet = ?", (w,))
        holdings, pending = [], []
        total_value = total_income_claimed = total_withdrawable = 0.0
        for r in assets:
            a = cat[r["asset_id"]]
            bal = self.ix.one(
                "SELECT COALESCE(SUM(CASE WHEN dst = ? THEN value ELSE 0 END),0) - "
                "COALESCE(SUM(CASE WHEN frm = ? THEN value ELSE 0 END),0) AS b FROM transfers WHERE token = ?",
                (w, w, r["token"]),
            )["b"]
            claimed = (
                self.ix.one(
                    "SELECT COALESCE(SUM(amount),0) AS s FROM income_claims WHERE token = ? AND holder = ?",
                    (r["token"], w),
                )["s"]
                / E6
            )
            committed = self.ix.one(
                "SELECT COALESCE(SUM(shares),0) AS s FROM investments WHERE offering = ? AND investor = ?",
                (r["offering"], w),
            )["s"]
            settled = self.ix.one("SELECT status FROM settlements WHERE offering = ?", (r["offering"],))
            got = self.ix.one(
                "SELECT COUNT(*) AS n FROM share_claims WHERE offering = ? AND investor = ?",
                (r["offering"], w),
            )["n"]
            withdrawable = 0.0
            if bal > 0:
                token = contract("AssetToken", r["token"])
                withdrawable = token.functions.withdrawableIncomeOf(wallet).call() / E6
                value = bal * a["share_price_eur"]
                total_value += value
                total_income_claimed += claimed
                total_withdrawable += withdrawable
                holdings.append(
                    {
                        "asset_id": a["id"],
                        "name": a["name"],
                        "name_fr": a["name_fr"],
                        "city_name": a["city_name"],
                        "category": a["category"],
                        "image": a["images"][0],
                        "token": r["token"],
                        "shares": bal,
                        "pct": round(bal / a["total_shares"] * 100, 3),
                        "value_eur": value,
                        "net_yield_pct": a["net_yield_pct"],
                        "income_claimed_eur": round(claimed, 2),
                        "income_withdrawable_eur": round(withdrawable, 2),
                        "monthly_income_eur": round(a["monthly_distribution_eur"] * bal / a["total_shares"], 2),
                    }
                )
            if committed and (not settled or not got):
                pending.append(
                    {
                        "asset_id": a["id"],
                        "name": a["name"],
                        "name_fr": a["name_fr"],
                        "image": a["images"][0],
                        "offering": r["offering"],
                        "shares": committed,
                        "value_eur": committed * a["share_price_eur"],
                        "status": OFFERING_STATUS[settled["status"]] if settled else "active",
                    }
                )
        income_events = self.ix.query("SELECT i.token, i.period, i.amount, i.ts FROM incomes i ORDER BY ts")
        monthly: dict[str, float] = defaultdict(float)
        for h in holdings:
            a = cat[h["asset_id"]]
            for ev in income_events:
                if ev["token"] == h["token"]:
                    monthly[ev["period"]] += ev["amount"] / E6 * h["shares"] / a["total_shares"]
        keur = core("keur").functions.balanceOf(wallet).call() / E6
        activity = self.ix.query(
            "SELECT 'invest' AS kind, offering AS ref, shares, paid AS value, ts, tx FROM investments WHERE investor = ? "
            "UNION ALL SELECT 'buy', token, shares, shares * price, ts, tx FROM trades WHERE buyer = ? "
            "UNION ALL SELECT 'sell', token, shares, shares * price, ts, tx FROM trades WHERE seller = ? "
            "UNION ALL SELECT 'claim', token, NULL, amount, ts, tx FROM income_claims WHERE holder = ? "
            "ORDER BY ts DESC LIMIT 30",
            (w, w, w, w),
        )
        ref_to_asset = {r["offering"]: r["asset_id"] for r in assets} | {r["token"]: r["asset_id"] for r in assets}
        return {
            "wallet": wallet,
            "profile": {
                **person(wallet),
                "country": identity["country"] if identity else None,
                "kyc": bool(identity),
                "kyc_expires_at": identity["expires_at"] if identity else None,
            },
            "cash_eur": round(keur, 2),
            "portfolio_value_eur": round(total_value, 2),
            "income_claimed_eur": round(total_income_claimed, 2),
            "income_withdrawable_eur": round(total_withdrawable, 2),
            "monthly_income_eur": round(sum(h["monthly_income_eur"] for h in holdings), 2),
            "holdings": sorted(holdings, key=lambda h: -h["value_eur"]),
            "pending": pending,
            "income_by_month": [{"period": k, "amount_eur": round(v, 2)} for k, v in sorted(monthly.items())],
            "activity": [
                {
                    **r,
                    "asset_id": ref_to_asset.get(r["ref"]),
                    "asset_name": cat.get(ref_to_asset.get(r["ref"]), {}).get("name"),
                    "value_eur": (r["value"] or 0) / E6,
                }
                for r in activity
            ],
        }
