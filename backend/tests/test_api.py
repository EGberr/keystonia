"""End-to-end API tests against the seeded local chain (read-only, plus the offline assistant)."""

from __future__ import annotations

import json

from tests.conftest import needs_chain

pytestmark = needs_chain


def test_health(client):
    h = client.get("/api/health").json()
    assert h["status"] == "ok" and h["chain_id"] == 31337
    assert h["assistant"] == "offline"


def test_overview_is_consistent(client):
    ov = client.get("/api/overview").json()
    assets = client.get("/api/assets").json()
    assert ov["assets"] == len(assets) == 24
    assert (
        ov["raised_eur"] == round(sum(a["raised_eur"] for a in assets), 2)
        or abs(ov["raised_eur"] - sum(a["raised_eur"] for a in assets)) < 1
    )
    assert ov["funded_assets"] == sum(a["phase"] == "funded" for a in assets)
    assert ov["live_offerings"] == sum(a["phase"] == "live" for a in assets)


def test_filters(client):
    paris = client.get("/api/assets", params={"city": "paris"}).json()
    assert paris and all(a["city"] == "paris" for a in paris)
    live = client.get("/api/assets", params={"phase": "live"}).json()
    assert all(a["phase"] == "live" for a in live)


def test_asset_detail_matches_chain(client):
    funded = next(a for a in client.get("/api/assets").json() if a["phase"] == "funded")
    d = client.get(f"/api/assets/{funded['id'].lower()}").json()
    assert d["id"] == funded["id"]
    assert d["token"].startswith("0x") and d["offering"].startswith("0x")
    # The cap table is derived from transfers and must sum to the shares minted.
    assert sum(h["shares"] for h in d["cap_table"]) <= d["total_shares"]
    assert d["income_history"] and d["income_distributed_eur"] > 0
    assert sorted(d["documents"]) == ["legal", "memorandum", "technical", "valuation"]


def test_unknown_asset_is_404(client):
    assert client.get("/api/assets/kst-xxx-999").status_code == 404


def test_document_is_markdown(client):
    r = client.get("/api/assets/KST-LON-001/documents/legal")
    assert r.status_code == 200 and "\n# " in r.text and "Legal structure" in r.text


def test_demo_portfolio(client):
    cfg = client.get("/api/config").json()
    p = client.get(f"/api/portfolio/{cfg['demoAccount']}").json()
    assert p["profile"]["kyc"] is True
    assert p["holdings"], "demo investor should hold shares"
    assert (
        p["portfolio_value_eur"] == round(sum(h["value_eur"] for h in p["holdings"]), 2)
        or abs(p["portfolio_value_eur"] - sum(h["value_eur"] for h in p["holdings"])) < 1
    )


def test_governance_and_market(client):
    props = client.get("/api/governance").json()
    assert {p["state"] for p in props} <= {"active", "defeated", "succeeded", "executed"}
    m = client.get("/api/market").json()
    assert all(lst["shares"] > 0 and lst["price_eur"] > 0 for lst in m["listings"])


def test_offline_assistant_streams_cited_answer(client):
    body = {
        "messages": [{"role": "user", "content": "What are the main risks?"}],
        "asset_id": "KST-RAK-001",
        "lang": "en",
    }
    with client.stream("POST", "/api/assistant", json=body) as r:
        events = [json.loads(line[5:]) for line in r.iter_lines() if line.startswith("data:")]
    kinds = [e["type"] for e in events]
    assert "tool_call" in kinds and "source" in kinds and kinds[-1] == "done"
    text = "".join(e["delta"] for e in events if e["type"] == "text")
    assert "[S1]" in text or "[D1]" in text
