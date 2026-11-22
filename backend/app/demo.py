"""Operator actions exposed for the local demo network only (KYC desk, test-money faucet, time travel)."""

from __future__ import annotations

import time
from datetime import UTC, datetime

from web3 import Web3

from app.chain import chain_time, contract, core, deployment, rpc, w3
from app.services import catalog

E6 = 10**6
DAY = 86_400
GAS = {"gas": 5_000_000}


def _operator() -> str:
    return next(a for a, v in deployment()["accounts"].items() if v["role"] == "operator")


def _send(fn) -> str:
    tx = fn.transact({"from": _operator(), **GAS})
    receipt = w3().eth.wait_for_transaction_receipt(tx)
    if receipt["status"] != 1:
        raise RuntimeError(f"{fn.fn_name} reverted")
    return receipt["transactionHash"].hex()


def verify_identity(wallet: str, country: int) -> str:
    """Simulated KYC desk: records a verified retail identity valid one year."""
    expires = chain_time() + 365 * DAY
    return _send(core("identity").functions.registerIdentity(Web3.to_checksum_address(wallet), country, 1, expires))


def faucet(wallet: str, amount_eur: int = 10_000) -> str:
    return _send(core("keur").functions.mint(Web3.to_checksum_address(wallet), amount_eur * E6))


def advance_month() -> dict:
    """Moves the chain 30 days forward, pays a month of income on funded assets and settles ended sales."""
    rpc("evm_increaseTime", [30 * DAY])
    rpc("evm_mine")
    now = chain_time()
    period = datetime.fromtimestamp(now, UTC).strftime("%Y-%m")
    dep = deployment()["assets"]
    keur = core("keur")
    paid, settled = [], []
    for a in catalog():
        meta = dep.get(a["id"])
        if not meta:
            continue
        offering = contract("Offering", meta["offering"])
        status = offering.functions.status().call()
        if status == 0 and now >= meta["endsAt"]:
            _send(offering.functions.finalize())
            settled.append(a["id"])
            status = offering.functions.status().call()
        token = contract("AssetToken", meta["token"])
        if status == 1 and token.functions.totalSupply().call() > 0:
            amount = int(a["monthly_distribution_eur"] * E6)
            _send(keur.functions.approve(token.address, amount))
            _send(token.functions.distributeIncome(amount, period))
            paid.append(a["id"])
    return {
        "chain_time": now,
        "period": period,
        "income_paid": paid,
        "offerings_settled": settled,
        "wall_clock": int(time.time()),
    }
