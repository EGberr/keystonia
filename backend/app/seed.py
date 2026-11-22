"""Deploys Keystonia to a local Anvil chain and replays ~13 months of realistic platform history.

Every action is a real transaction (deployments, KYC, offerings, investments, settlements, rent
distributions, secondary-market trades, governance votes) timestamped in the past with
`evm_setNextBlockTimestamp`, so the chain ends at the present with a coherent history.

Start a fresh chain whose genesis is in the past, then seed:
    anvil --accounts 40 --balance 10000 --timestamp $(( $(date +%s) - 400*86400 )) --state data/chain/state.json
    uv run python -m app.seed
"""

from __future__ import annotations

import json
import math
import random
import time
from datetime import UTC, datetime
from typing import Any

from app.chain import artifact, chain_time, rpc, w3
from app.config import settings
from app.personas import (
    ACCOUNT_COUNT,
    DEMO_ACCOUNT,
    INVESTORS,
    ISSUER_FOR_ASSET,
    ISSUERS,
    OPERATOR,
    TREASURY,
    US,
)

DAY = 86_400
E6 = 10**6
SEED = 42
NO_REQUEST = 2**256 - 1


class Clock:
    """Monotonic timestamp setter for the next mined block."""

    def __init__(self, start: int) -> None:
        self.t = start

    def at(self, ts: int) -> int:
        self.t = max(int(ts), self.t + 1)
        rpc("evm_setNextBlockTimestamp", [self.t])
        return self.t


class Seeder:
    def __init__(self) -> None:
        self.w3 = w3()
        self.acc = self.w3.eth.accounts[:ACCOUNT_COUNT]
        if len(self.acc) < ACCOUNT_COUNT:
            raise SystemExit(f"Anvil must expose {ACCOUNT_COUNT} accounts (--accounts {ACCOUNT_COUNT}).")
        self.op = self.acc[OPERATOR]
        self.rng = random.Random(SEED)
        self.now = int(time.time())
        start = chain_time()
        if self.now - start < 380 * DAY:
            raise SystemExit("Chain genesis must be >= 380 days in the past: restart anvil with --timestamp.")
        self.clock = Clock(start)
        self.catalog = json.loads((settings.catalog_dir / "assets.json").read_text())
        self.manifest: dict[str, Any] = {
            "chainId": settings.chain_id,
            "contracts": {},
            "assets": {},
            "accounts": {},
        }
        self.tx_count = 0

    # ── low-level helpers ────────────────────────────────────────────────────
    def send(self, fn, sender: str, ts: int | None = None):
        if ts is not None:
            self.clock.at(ts)
        else:
            self.clock.at(self.clock.t + 15)
        # Explicit gas: estimation would run against the previous block's timestamp, not the one set above.
        tx = fn.transact({"from": sender, "gas": 15_000_000})
        self.tx_count += 1
        receipt = self.w3.eth.wait_for_transaction_receipt(tx)
        if receipt["status"] != 1:
            raise RuntimeError(f"transaction failed: {fn.fn_name}")
        return receipt

    def deploy(self, name: str, *args, ts: int | None = None):
        a = artifact(name)
        factory = self.w3.eth.contract(abi=a["abi"], bytecode=a["bytecode"])
        receipt = self.send(factory.constructor(*args), self.op, ts)
        return self.w3.eth.contract(address=receipt["contractAddress"], abi=a["abi"])

    # ── scenario ─────────────────────────────────────────────────────────────
    def run(self) -> None:
        t0 = self.clock.t + 60
        self.keur = self.deploy("KEUR", self.op, ts=t0)
        self.ids = self.deploy("IdentityRegistry", self.op)
        self.registry = self.deploy("AssetRegistry", self.ids.address, self.op)
        self.market = self.deploy(
            "Marketplace",
            self.keur.address,
            self.registry.address,
            self.acc[TREASURY],
            100,
            self.op,
        )
        self.governor = self.deploy("AssetGovernor", self.registry.address, self.op)
        self.manifest["contracts"] = {
            "keur": self.keur.address,
            "identity": self.ids.address,
            "registry": self.registry.address,
            "market": self.market.address,
            "governor": self.governor.address,
        }
        self.manifest["deployedAt"] = t0
        self.kyc()
        self.fund()

        schedule = self.schedule()
        for asset in self.catalog:
            self.list_asset(asset, schedule[asset["id"]])
        self.history()
        self.clock.at(self.now)
        rpc("evm_mine")
        self.save()

    def kyc(self) -> None:
        expires = self.now + 2 * 365 * DAY
        people = {
            **{i: (v["name"], v["country"]) for i, v in ISSUERS.items()},
            **INVESTORS,
        }
        for idx, (name, country) in people.items():
            tier = 2 if idx in ISSUERS else 1
            self.send(
                self.ids.functions.registerIdentity(self.acc[idx], country, tier, expires),
                self.op,
            )
            self.manifest["accounts"][self.acc[idx]] = {
                "index": idx,
                "name": name,
                "country": country,
                "role": "issuer" if idx in ISSUERS else "investor",
            }
        self.manifest["accounts"][self.op] = {
            "index": OPERATOR,
            "name": "Keystonia operator",
            "role": "operator",
        }
        self.manifest["accounts"][self.acc[TREASURY]] = {
            "index": TREASURY,
            "name": "Keystonia treasury",
            "role": "treasury",
        }
        self.manifest["demoAccount"] = self.acc[DEMO_ACCOUNT]

    def fund(self) -> None:
        for idx in INVESTORS:
            amount = 25_000 if idx == DEMO_ACCOUNT else self.rng.choice([400_000, 900_000, 1_500_000, 2_500_000])
            self.send(self.keur.functions.mint(self.acc[idx], amount * E6), self.op)
        self.send(self.keur.functions.mint(self.op, 50_000_000 * E6), self.op)

    def schedule(self) -> dict[str, dict[str, int]]:
        """Offering windows: funded assets were sold in the past, live ones are open now, upcoming open soon."""
        out: dict[str, dict[str, int]] = {}
        funded = [a for a in self.catalog if a["status"] == "funded"]
        start = self.clock.t + 2 * DAY
        for i, a in enumerate(funded):
            listed = start + i * 20 * DAY + self.rng.randint(0, 5) * DAY
            out[a["id"]] = {
                "listed": listed,
                "start": listed + DAY,
                "end": listed + 22 * DAY,
            }
        for a in self.catalog:
            if a["status"] == "live":
                s = self.now - self.rng.randint(3, 21) * DAY
                out[a["id"]] = {
                    "listed": s - DAY,
                    "start": s,
                    "end": self.now + self.rng.randint(9, 40) * DAY,
                }
            elif a["status"] == "upcoming":
                s = self.now + self.rng.randint(4, 25) * DAY
                out[a["id"]] = {
                    "listed": self.now - self.rng.randint(1, 6) * DAY,
                    "start": s,
                    "end": s + 30 * DAY,
                }
        return out

    def list_asset(self, a: dict, when: dict[str, int]) -> None:
        a["_when"] = when
        a["_listed_ts"] = when["listed"]

    # ── event replay ─────────────────────────────────────────────────────────
    def history(self) -> None:
        """Builds a single timeline of actions across assets, then executes it in time order."""
        events: list[tuple[int, int, Any]] = []
        seq = 0

        def add(ts: int, fn) -> None:
            nonlocal seq
            seq += 1
            events.append((int(ts), seq, fn))

        for a in self.catalog:
            w = a["_when"]
            add(w["listed"], lambda a=a: self.create_asset(a))
            if a["status"] in ("funded", "live"):
                for ts, idx, shares in self.plan_investments(a):
                    add(
                        ts,
                        lambda a=a, idx=idx, shares=shares: self.invest(a, idx, shares),
                    )
            if a["status"] == "funded":
                add(w["end"] + 3600, lambda a=a: self.settle(a))
                add(w["end"] + DAY, lambda a=a: self.claim_all(a))
                self.plan_income(a, add)
                self.plan_market(a, add)
        self.plan_governance(add)
        self.plan_requests(add)

        events.sort(key=lambda e: (e[0], e[1]))
        for ts, _, fn in events:
            if ts > self.now - 60:
                continue
            self.clock.at(ts - 1)
            fn()

    def create_asset(self, a: dict) -> None:
        issuer = self.acc[ISSUER_FOR_ASSET[a["id"]]]
        w = a["_when"]
        token = self.deploy(
            "AssetToken",
            f"Keystonia {a['id']}",
            a["id"].replace("-", ""),
            a["id"],
            a["total_shares"],
            self.ids.address,
            self.keur.address,
            self.op,
        )
        self.send(token.functions.setCountryBlocked(US, True), self.op)
        minter = token.functions.MINTER_ROLE().call()
        self.send(token.functions.grantRole(minter, self.op), self.op)
        self.send(token.functions.mint(issuer, a["retained_shares"]), self.op)
        config = (
            token.address,
            self.keur.address,
            self.ids.address,
            issuer,
            self.acc[TREASURY],
            a["share_price_eur"] * E6,
            a["offered_shares"],
            math.ceil(a["offered_shares"] * 0.6),
            0,
            w["start"],
            w["end"],
            200,
        )
        offering = self.deploy("Offering", config, self.op)
        self.send(token.functions.grantRole(minter, offering.address), self.op)
        self.send(
            self.registry.functions.registerAsset(
                token.address,
                offering.address,
                a["category_index"],
                a["city_name"],
                f"keystonia://assets/{a['id']}",
                a["valuation_eur"] * E6,
                NO_REQUEST,
            ),
            self.op,
        )
        a["_token"], a["_offering"], a["_issuer"] = token, offering, issuer
        a["_approved"] = set()
        self.manifest["assets"][a["id"]] = {
            "token": token.address,
            "offering": offering.address,
            "issuer": issuer,
            "listedAt": w["listed"],
            "startsAt": w["start"],
            "endsAt": w["end"],
        }

    def plan_investments(self, a: dict) -> list[tuple[int, int, int]]:
        w = a["_when"]
        offered = a["offered_shares"]
        if a["status"] == "funded":
            target = offered if self.rng.random() < 0.75 else int(offered * self.rng.uniform(0.86, 0.97))
            end = w["end"] - DAY
        else:
            target = int(offered * self.rng.uniform(0.18, 0.88))
            end = min(w["end"], self.now - 3600)
        pool = [i for i in INVESTORS if INVESTORS[i][1] != US and i != DEMO_ACCOUNT]
        crowd = self.rng.sample(pool, k=min(len(pool), self.rng.randint(12, 24)))
        n = self.rng.randint(22, 48)
        weights = [self.rng.paretovariate(1.6) for _ in range(n)]
        total = sum(weights)
        plan, allocated = [], 0
        for k, wgt in enumerate(weights):
            shares = max(1, int(target * wgt / total))
            if allocated + shares > target or k == n - 1:
                shares = target - allocated
            if shares <= 0:
                continue
            allocated += shares
            ts = int(w["start"] + (end - w["start"]) * (k + self.rng.random()) / n)
            plan.append((ts, self.rng.choice(crowd), shares))
        # The demo investor owns a slice of a few assets.
        if a["id"] in (
            "KST-PAR-001",
            "KST-LON-003",
            "KST-RAK-001",
            "KST-NYC-002",
            "KST-PAR-004",
        ):
            tickets = {
                "KST-PAR-001": 40,
                "KST-LON-003": 60,
                "KST-RAK-001": 50,
                "KST-NYC-002": 30,
                "KST-PAR-004": 12,
            }
            first = plan[0]
            plan[0] = (first[0], first[1], max(1, first[2] - tickets[a["id"]]))
            plan.append((first[0] + 600, DEMO_ACCOUNT, tickets[a["id"]]))
        return plan

    def invest(self, a: dict, idx: int, shares: int) -> None:
        investor = self.acc[idx]
        offering = a["_offering"]
        left = a["offered_shares"] - offering.functions.sharesSold().call()
        shares = min(shares, left)
        if shares <= 0:
            return
        cost = shares * a["share_price_eur"] * E6
        balance = self.keur.functions.balanceOf(investor).call()
        if balance < cost:  # test money only: top up the simulated investor
            self.send(
                self.keur.functions.mint(investor, cost - balance + 50_000 * E6),
                self.op,
            )
        if investor not in a["_approved"]:
            self.send(self.keur.functions.approve(offering.address, 2**255), investor)
            a["_approved"].add(investor)
        self.send(offering.functions.invest(shares), investor)

    def settle(self, a: dict) -> None:
        self.send(a["_offering"].functions.finalize(), self.op)

    def claim_all(self, a: dict) -> None:
        for investor in sorted(a["_approved"]):
            if a["_offering"].functions.commitmentOf(investor).call() > 0:
                self.send(a["_offering"].functions.claimShares(), investor)

    def plan_income(self, a: dict, add) -> None:
        first = datetime.fromtimestamp(a["_when"]["end"] + 5 * DAY, UTC)
        month = datetime(first.year, first.month, 1, tzinfo=UTC)
        k = 0
        while True:
            k += 1
            y, m = (
                month.year + (month.month - 1 + k) // 12,
                (month.month - 1 + k) % 12 + 1,
            )
            ts = int(datetime(y, m, 3, 9, tzinfo=UTC).timestamp())
            if ts > self.now - DAY:
                break
            seasonal = 1.0
            if a["category"] == "hospitality":
                seasonal = 1 + 0.22 * math.sin((m - 3) / 12 * 2 * math.pi)
            amount = int(a["monthly_distribution_eur"] * seasonal * self.rng.uniform(0.95, 1.05) * E6)
            period = f"{y}-{m:02d}"
            add(
                ts,
                lambda a=a, amount=amount, period=period: self.distribute(a, amount, period),
            )
            add(ts + 3 * DAY, lambda a=a: self.random_claims(a))

    def distribute(self, a: dict, amount: int, period: str) -> None:
        token = a["_token"]
        self.send(self.keur.functions.approve(token.address, amount), self.op)
        self.send(token.functions.distributeIncome(amount, period), self.op)

    def random_claims(self, a: dict) -> None:
        token = a["_token"]
        for investor in sorted(a["_approved"]):
            if investor == self.acc[DEMO_ACCOUNT]:
                continue  # leave income to claim in the demo
            if self.rng.random() < 0.35 and token.functions.withdrawableIncomeOf(investor).call() > 0:
                self.send(token.functions.claimIncome(), investor)

    def plan_market(self, a: dict, add) -> None:
        start = a["_when"]["end"] + 10 * DAY
        for _k in range(self.rng.randint(2, 5)):
            ts = start + self.rng.randint(5, 260) * DAY
            add(ts, lambda a=a: self.market_activity(a))

    def market_activity(self, a: dict) -> None:
        token = a["_token"]
        holders = [
            h
            for h in sorted(a["_approved"])
            if token.functions.balanceOf(h).call() >= 10 and h != self.acc[DEMO_ACCOUNT]
        ]
        if not holders:
            return
        seller = self.rng.choice(holders)
        bal = token.functions.balanceOf(seller).call()
        qty = max(1, int(bal * self.rng.uniform(0.1, 0.4)))
        price = int(a["share_price_eur"] * E6 * self.rng.uniform(0.97, 1.09))
        self.send(token.functions.approve(self.market.address, 2**255), seller)
        receipt = self.send(self.market.functions.list(token.address, qty, price), seller)
        listing_id = self.market.events.Listed().process_receipt(receipt)[0]["args"]["id"]
        buyers = [
            self.acc[i] for i in INVESTORS if INVESTORS[i][1] != US and self.acc[i] != seller and i != DEMO_ACCOUNT
        ]
        remaining = qty
        for _ in range(self.rng.randint(0, 3)):
            if remaining <= 0:
                break
            buyer = self.rng.choice(buyers)
            take = max(1, int(remaining * self.rng.uniform(0.3, 1.0)))
            cost = take * price
            if self.keur.functions.balanceOf(buyer).call() < cost:
                self.send(self.keur.functions.mint(buyer, cost + 50_000 * E6), self.op)
            self.send(self.keur.functions.approve(self.market.address, 2**255), buyer)
            self.send(self.market.functions.buy(listing_id, take), buyer)
            remaining -= take

    def plan_governance(self, add) -> None:
        proposals = [
            (
                "KST-PAR-001",
                120,
                14,
                "Replace the terrace glazing to reach energy rating B",
                "Quote €84,000 funded from the maintenance reserve; expected rating B.",
                "past_for",
            ),
            (
                "KST-LON-002",
                70,
                10,
                "Refinance the hotel at a 4.1% fixed rate",
                "Raise £6m to add eight suites in the mansard; increases leverage.",
                "past_against",
            ),
            (
                "KST-RAK-001",
                6,
                12,
                "Open a rooftop restaurant for guests",
                "€420,000 fit-out; operator forecasts +9% revenue per available room.",
                "active",
            ),
            (
                "KST-NYC-002",
                3,
                9,
                "Renew the hotel management contract for ten years",
                "Base fee plus 12% of gross operating profit, with a performance test every three years.",
                "active",
            ),
        ]
        for asset_id, days_ago, duration, title, desc, kind in proposals:
            a = next(x for x in self.catalog if x["id"] == asset_id)
            ts = self.now - days_ago * DAY
            state: dict[str, Any] = {}
            add(
                ts,
                lambda a=a, title=title, desc=desc, duration=duration, state=state: self.propose(
                    a, title, desc, duration, state
                ),
            )
            window = duration * DAY if kind.startswith("past") else min(duration * DAY, days_ago * DAY - 7200)
            for k in range(40):
                vote_ts = ts + 3600 + int(window * 0.8 * k / 40)
                add(
                    vote_ts,
                    lambda a=a, k=k, kind=kind, state=state: self.vote(a, k, kind, state),
                )
            if kind == "past_for":
                add(
                    ts + duration * DAY + 2 * DAY,
                    lambda state=state: self.send(
                        self.governor.functions.markExecuted(state["id"], "Works ordered by the SPV"),
                        self.op,
                    ),
                )

    def propose(self, a: dict, title: str, desc: str, duration: int, state: dict) -> None:
        receipt = self.send(
            self.governor.functions.propose(a["_token"].address, title, desc, duration * DAY),
            self.op,
        )
        state["id"] = self.governor.events.ProposalCreated().process_receipt(receipt)[0]["args"]["id"]
        token = a["_token"]
        state["voters"] = [a["_issuer"]] + [
            h for h in sorted(a["_approved"]) if h != self.acc[DEMO_ACCOUNT] and token.functions.balanceOf(h).call() > 0
        ]

    def vote(self, a: dict, k: int, kind: str, state: dict) -> None:
        voters = state.get("voters", [])
        if k >= len(voters):
            return
        voter = voters[k]
        if kind == "active" and k > 0 and self.rng.random() < 0.45:
            return
        if voter == a["_issuer"]:
            support = 0 if kind == "past_against" else 1
        elif kind == "past_for":
            support = 1 if self.rng.random() < 0.8 else 0
        elif kind == "past_against":
            support = 0 if self.rng.random() < 0.55 else 1
        else:
            support = self.rng.choice([1, 1, 1, 0, 2])
        self.send(self.governor.functions.castVote(state["id"], support), voter)

    def plan_requests(self, add) -> None:
        reqs = [
            (
                4,
                0,
                "Barcelona",
                "keystonia://requests/barcelona-eixample-loft",
                690_000,
                None,
            ),
            (
                6,
                1,
                "Essaouira",
                "keystonia://requests/essaouira-surf-hostel",
                410_000,
                None,
            ),
            (
                8,
                0,
                "Porto",
                "keystonia://requests/porto-ribeira-apartments",
                2_900_000,
                "Asked valuation not supported by comparable sales",
            ),
        ]
        for idx, cat, city, uri, value, reject in reqs:
            ts = self.now - self.rng.randint(4, 20) * DAY
            state: dict[str, Any] = {}

            def submit(idx=idx, cat=cat, city=city, uri=uri, value=value, state=state):
                receipt = self.send(
                    self.registry.functions.submitListing(cat, city, uri, value * E6),
                    self.acc[idx],
                )
                state["id"] = self.registry.events.ListingRequested().process_receipt(receipt)[0]["args"]["requestId"]

            add(ts, submit)
            if reject:
                add(
                    ts + 2 * DAY,
                    lambda reject=reject, state=state: self.send(
                        self.registry.functions.rejectRequest(state["id"], reject),
                        self.op,
                    ),
                )

    def save(self) -> None:
        self.manifest["seededAt"] = self.now
        self.manifest["block"] = self.w3.eth.block_number
        settings.deployment_file.parent.mkdir(parents=True, exist_ok=True)
        settings.deployment_file.write_text(json.dumps(self.manifest, indent=1))
        print(f"Seeded {len(self.catalog)} assets with {self.tx_count} transactions; block {self.manifest['block']}")


def main() -> None:
    if not w3().is_connected():
        raise SystemExit(f"Cannot reach {settings.rpc_url}: start anvil first.")
    Seeder().run()


if __name__ == "__main__":
    main()
