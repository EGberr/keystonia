"""Builds data/catalog/*.json and the per-asset document packs (Markdown) from catalog_spec.py.

Run: python3 scripts/build_catalog.py
"""

import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from catalog_spec import ASSETS, CATEGORIES, CITIES, FX, INDICATIVE_EUR_M2  # noqa: E402
from tours import TOURS  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
REF = json.loads((ROOT / "data" / "market" / "reference.json").read_text())
OUT = ROOT / "data" / "catalog"
OPERATING_COST_SHARE = 0.27  # gross-to-net: management, maintenance, insurance, property tax


def eur(v: float) -> str:
    return f"€{v:,.0f}"


def valuation(a: dict) -> tuple[float, dict]:
    """Returns (valuation in EUR, valuation evidence)."""
    if a["value"] == "dvf":
        ref = REF["paris"]["by_postcode"][a["ref"]]
        v = a["surface"] * ref["median_eur_m2"] * 1.05
        return v, {
            "method": "Comparable sales",
            "reference": f"Median {eur(ref['median_eur_m2'])}/m² for apartments in {a['ref']} "
            f"({ref['sales']:,} sales in 2024)",
            "source": REF["paris"]["source"],
            "adjustment": "+5% for condition and floor",
            "indicative": False,
        }
    if a["value"] == "lr":
        ref = REF["london"]["by_borough"][a["ref"]]
        v = a["units"] * ref["median_flat_gbp"] * FX["GBP"] * (a["surface"] / a["units"] / 70) ** 0.5
        return v, {
            "method": "Comparable sales",
            "reference": f"Median flat price £{ref['median_flat_gbp']:,} in {a['ref']} ({ref['sales']:,} sales in 2024), "
            "size-adjusted",
            "source": REF["london"]["source"],
            "adjustment": f"GBP converted at {FX['GBP']} EUR",
            "indicative": False,
        }
    if a["value"] == "m2":
        ppm2 = INDICATIVE_EUR_M2[(a["city"], a["district"])]
        return a["surface"] * ppm2, {
            "method": "Indicative price per m²",
            "reference": f"Indicative {eur(ppm2)}/m² for {a['district']}",
            "source": "Keystonia indicative estimate (no open transaction dataset for this market)",
            "adjustment": "None",
            "indicative": a["city"] not in ("paris", "london"),
        }
    v = a["noi"] / (a["cap_rate"] / 100)
    return v, {
        "method": "Income capitalisation",
        "reference": f"Net operating income {eur(a['noi'])} capitalised at {a['cap_rate']}%",
        "source": "Operator accounts (fictional) and market cap rates",
        "adjustment": "None",
        "indicative": a["city"] not in ("paris", "london"),
    }


def build_asset(a: dict) -> dict:
    v, evidence = valuation(a)
    share_price = a["share_price"]
    total_shares = int(round(v / share_price / 10) * 10)
    v = total_shares * share_price
    if a["value"] == "income":
        noi = a["noi"]
    else:
        noi = v * a["gross_yield"] / 100 * (1 - OPERATING_COST_SHARE)
    net_yield = noi / v * 100
    # Cap-rate valued assets start from NOI, so gross yield is derived from it (never below net).
    gross_yield = noi / (1 - OPERATING_COST_SHARE) / v * 100 if a["value"] == "income" else a["gross_yield"]
    offered_shares = int(total_shares * a["offered"] / 100)
    city = CITIES[a["city"]]
    return {
        "id": a["id"],
        "slug": a["id"].lower(),
        "name": a["name"],
        "name_fr": a["name_fr"],
        "tagline": a["tagline"],
        "tagline_fr": a["tagline_fr"],
        "city": a["city"],
        "city_name": city["name"],
        "country": city["country"],
        "country_iso": city["iso"],
        "currency": city["currency"],
        "district": a["district"],
        "category": a["category"],
        "category_index": CATEGORIES[a["category"]]["index"],
        "lat": a["lat"],
        "lon": a["lon"],
        "surface_m2": a["surface"],
        "units": a["units"],
        "layout": a["rooms"],
        "year_built": a["year"],
        "energy_rating": a["energy"],
        "operator": a["operator"],
        "occupancy_pct": a["occupancy"],
        "valuation_eur": v,
        "share_price_eur": share_price,
        "total_shares": total_shares,
        "offered_shares": offered_shares,
        "retained_shares": total_shares - offered_shares,
        "offered_pct": a["offered"],
        "gross_yield_pct": round(gross_yield, 2),
        "net_yield_pct": round(net_yield, 2),
        "annual_noi_eur": round(noi),
        "monthly_distribution_eur": round(noi / 12),
        "status": a["status"],
        "valuation_evidence": evidence,
        "highlights": a["highlights"],
        "risks": a["risks"],
        "image_query": a["image_query"],
        "images": [f"/img/assets/{a['id'].lower()}-{i}.jpg" for i in range(3)],
        "tour": [{"pano": f"/pano/{p}.jpg", "preview": f"/pano/{p}_preview.jpg", "en": en, "fr": fr} for p, en, fr in TOURS[a["id"]]],
    }


def documents(x: dict) -> dict[str, str]:
    ev = x["valuation_evidence"]
    name = x["name"]
    disclaimer = (
        "> **Demo document.** This asset is fictional and part of the Keystonia demonstration network. "
        "No real investment is offered."
    )
    memo = f"""---
id: {x['id']}-memorandum
title: {name} — Investment memorandum
asset: {x['id']}
type: memorandum
---
# {name} — Investment memorandum

{disclaimer}

## Summary
{name} is a {x['layout'].lower()} ({x['surface_m2']:,} m²) in {x['district']}, {x['city_name']}, {x['country']}. \
{x['tagline']}. The asset is valued at {eur(x['valuation_eur'])} and divided into {x['total_shares']:,} shares of \
{eur(x['share_price_eur'])}. {x['offered_pct']}% of the shares ({x['offered_shares']:,}) are offered to investors; the \
owner retains {x['retained_shares']:,} shares.

## Income
Gross yield is {x['gross_yield_pct']}% and the projected net yield after operating costs is {x['net_yield_pct']}%, i.e. a \
net operating income of {eur(x['annual_noi_eur'])} per year, distributed monthly ({eur(x['monthly_distribution_eur'])} per \
month across all shares). Occupancy is {x['occupancy_pct']}%. Operator / tenant: {x['operator']}.

## Highlights
""" + "\n".join(f"- {h}" for h in x["highlights"]) + """

## Key risks
""" + "\n".join(f"- {r}" for r in x["risks"]) + f"""
- Shares are illiquid outside the Keystonia secondary market; prices may differ from the valuation.
- Valuations can go down as well as up.

## Location
{x['district']} ({x['city_name']}). Coordinates {x['lat']:.4f}, {x['lon']:.4f}.
"""
    val = f"""---
id: {x['id']}-valuation
title: {name} — Valuation report
asset: {x['id']}
type: valuation
---
# {name} — Valuation report

{disclaimer}

## Method
{ev['method']}.

## Market evidence
{ev['reference']}. Source: {ev['source']}.
{'This market has no open transaction dataset: the figure is an indicative estimate and should be treated with caution.' if ev['indicative'] else 'The reference comes from official open transaction data.'}

## Conclusion
Adjustment: {ev['adjustment']}. Concluded value: {eur(x['valuation_eur'])} \
({eur(x['valuation_eur'] / max(x['surface_m2'], 1))} per m²). Share price: {eur(x['share_price_eur'])}.
"""
    energy = x["energy_rating"]
    energy_note = (
        "No energy performance certificate applies to this asset type in this market."
        if energy == "-"
        else f"Energy rating {energy}. "
        + ("Below C: improvement works are budgeted over the next five years." if energy in "DEFG" else
           "Meets current efficiency expectations.")
    )
    tech = f"""---
id: {x['id']}-technical
title: {name} — Technical survey
asset: {x['id']}
type: technical
---
# {name} — Technical survey

{disclaimer}

## Building
Built in {x['year_built']}. Layout: {x['layout']}. Surface: {x['surface_m2']:,} m².

## Energy
{energy_note}

## Condition and capital expenditure
{'Older building: a maintenance reserve of 1.5% of rent per year is held by the SPV.' if x['year_built'] < 1950 else 'Recent building: standard maintenance reserve of 0.8% of rent per year.'}
"""
    legal = f"""---
id: {x['id']}-legal
title: {name} — Legal structure
asset: {x['id']}
type: legal
---
# {name} — Legal structure

{disclaimer}

## Ownership
The asset is held by a dedicated special-purpose vehicle (SPV) registered in {x['country']}. Each Keystonia share token \
represents one share of that SPV. Token holders receive income pro rata and vote on major decisions (works, refinancing, \
sale, change of operator) through on-chain proposals with a 20% quorum.

## Transfers and compliance
Shares can only be held by investors who completed identity verification (KYC). Transfers are checked on-chain against \
the identity registry; jurisdiction restrictions may apply. An agent can freeze a wallet or recover shares from a lost \
wallet following a legal procedure.

## Exit
A sale of the asset requires a shareholder vote. Proceeds are distributed to holders pro rata to their shares.
"""
    return {"memorandum": memo, "valuation": val, "technical": tech, "legal": legal}


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "docs").mkdir(parents=True)
    assets = [build_asset(a) for a in ASSETS]
    for x in assets:
        d = OUT / "docs" / x["id"]
        d.mkdir()
        for kind, text in documents(x).items():
            (d / f"{kind}.md").write_text(text)
    cities = {k: {**v, "assets": sum(1 for a in assets if a["city"] == k)} for k, v in CITIES.items()}
    (OUT / "assets.json").write_text(json.dumps(assets, indent=1, ensure_ascii=False))
    (OUT / "cities.json").write_text(json.dumps(cities, indent=1, ensure_ascii=False))
    (OUT / "categories.json").write_text(json.dumps(CATEGORIES, indent=1, ensure_ascii=False))
    total = sum(a["valuation_eur"] for a in assets)
    print(f"{len(assets)} assets, {sum(1 for _ in OUT.glob('docs/*/*.md'))} documents, total value {eur(total)}")
    for a in assets:
        print(f"{a['id']:12s} {a['status']:9s} {eur(a['valuation_eur']):>13s} {a['total_shares']:>7,} sh "
              f"net {a['net_yield_pct']:>5}%  {a['name']}")


if __name__ == "__main__":
    main()
