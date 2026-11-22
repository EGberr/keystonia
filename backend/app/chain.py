"""Web3 connection, contract artifacts and the deployment manifest."""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from web3 import Web3
from web3.contract import Contract

from app.config import settings

CONTRACTS = (
    "KEUR",
    "IdentityRegistry",
    "AssetRegistry",
    "AssetToken",
    "Offering",
    "Marketplace",
    "AssetGovernor",
)


@lru_cache
def artifact(name: str) -> dict[str, Any]:
    data = json.loads((settings.contracts_out / f"{name}.sol" / f"{name}.json").read_text())
    return {"abi": data["abi"], "bytecode": data["bytecode"]["object"]}


@lru_cache
def w3() -> Web3:
    return Web3(Web3.HTTPProvider(settings.rpc_url, request_kwargs={"timeout": 30}))


def contract(name: str, address: str) -> Contract:
    return w3().eth.contract(address=Web3.to_checksum_address(address), abi=artifact(name)["abi"])


def deployment() -> dict[str, Any]:
    return json.loads(settings.deployment_file.read_text())


def core(name: str) -> Contract:
    """Core singletons from the deployment manifest: keur, identity, registry, market, governor."""
    return contract(
        {
            "keur": "KEUR",
            "identity": "IdentityRegistry",
            "registry": "AssetRegistry",
            "market": "Marketplace",
            "governor": "AssetGovernor",
        }[name],
        deployment()["contracts"][name],
    )


def chain_time() -> int:
    return int(w3().eth.get_block("latest")["timestamp"])


def rpc(method: str, params: list | None = None) -> Any:
    resp = w3().provider.make_request(method, params or [])
    if "error" in resp:
        raise RuntimeError(f"{method}: {resp['error']}")
    return resp.get("result")
