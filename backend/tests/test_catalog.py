"""Static checks on the generated catalogue: the numbers the contracts and UI rely on must be coherent."""

from __future__ import annotations

from collections import Counter

import pytest

from app.config import settings
from app.services import catalog, categories, cities

ASSETS = catalog()


def test_catalogue_shape():
    assert len(ASSETS) == 24
    assert len({a["id"] for a in ASSETS}) == 24
    assert Counter(a["city"] for a in ASSETS) == {"paris": 6, "london": 6, "marrakech": 6, "lisbon": 6}
    assert {a["category"] for a in ASSETS} == set(categories())
    assert set(cities()) == {"paris", "london", "marrakech", "lisbon"}


@pytest.mark.parametrize("a", ASSETS, ids=lambda a: a["id"])
def test_asset_economics(a):
    # Shares tile the valuation exactly and the offering never exceeds the supply.
    assert a["total_shares"] * a["share_price_eur"] == pytest.approx(a["valuation_eur"], rel=1e-9)
    assert a["offered_shares"] + a["retained_shares"] == a["total_shares"]
    assert 0 < a["offered_shares"] <= a["total_shares"]
    # Net yield is below gross yield and in a realistic band for income property.
    assert 0 < a["net_yield_pct"] < a["gross_yield_pct"] < 15
    assert a["annual_noi_eur"] == pytest.approx(a["valuation_eur"] * a["net_yield_pct"] / 100, rel=0.02)
    assert a["monthly_distribution_eur"] == pytest.approx(a["annual_noi_eur"] / 12, rel=0.02)
    assert 0 <= a["occupancy_pct"] <= 100
    assert a["highlights"] and a["risks"]
    assert len(a["images"]) >= 1


@pytest.mark.parametrize("a", ASSETS, ids=lambda a: a["id"])
def test_documents_exist(a):
    for kind in ("memorandum", "valuation", "technical", "legal"):
        doc = settings.catalog_dir / "docs" / a["id"] / f"{kind}.md"
        assert doc.exists(), doc
        assert a["name"] in doc.read_text()


def test_valuation_evidence_is_sourced():
    for a in ASSETS:
        ev = a["valuation_evidence"]
        assert ev["method"] and ev["source"]
        # Paris and London use open transaction data; the other markets are flagged as indicative.
        assert ev["indicative"] == (a["city"] not in {"paris", "london"})
