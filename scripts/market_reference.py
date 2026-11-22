"""Builds market reference prices from public open data.

- Paris: DVF 2024 (data.gouv.fr, Licence Ouverte 2.0). Median price per m² of single-apartment sales,
  by arrondissement.
- London: HM Land Registry Price Paid 2024 (Open Government Licence v3.0). Median flat price by borough.

Usage: python3 scripts/market_reference.py  (expects data/raw/dvf75-2024.csv.gz and data/raw/pp-2024.csv)
"""

import csv
import gzip
import json
import statistics
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "market" / "reference.json"


def paris() -> dict:
    by_mutation: dict[str, list[dict]] = defaultdict(list)
    with gzip.open(RAW / "dvf75-2024.csv.gz", "rt", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["nature_mutation"] != "Vente" or not row["valeur_fonciere"]:
                continue
            by_mutation[row["id_mutation"]].append(row)
    per_arr: dict[str, list[float]] = defaultdict(list)
    for rows in by_mutation.values():
        locals_ = [r for r in rows if r["type_local"] in ("Appartement", "Maison", "Local industriel. commercial ou assimilé")]
        apartments = [r for r in locals_ if r["type_local"] == "Appartement"]
        if len(apartments) != 1 or len(locals_) != 1:
            continue  # keep clean single-apartment sales only
        a = apartments[0]
        surface = float(a["surface_reelle_bati"] or 0)
        price = float(a["valeur_fonciere"])
        if surface < 12 or price < 50_000:
            continue
        ppm2 = price / surface
        if 3_000 <= ppm2 <= 40_000:
            per_arr[a["code_postal"]].append(ppm2)
    return {
        cp: {"median_eur_m2": round(statistics.median(v)), "sales": len(v)}
        for cp, v in sorted(per_arr.items())
        if len(v) >= 50
    }


def london() -> dict:
    per_borough: dict[str, list[int]] = defaultdict(list)
    with open(RAW / "pp-2024.csv", encoding="utf-8") as f:
        for row in csv.reader(f):
            # price, date, postcode, type (F = flat), new build, tenure, ..., district (12), county (13), category (14)
            if row[13] != "GREATER LONDON" or row[4] != "F" or row[14] != "A":
                continue
            per_borough[row[12].title()].append(int(row[1]))
    return {
        b: {"median_flat_gbp": int(statistics.median(v)), "sales": len(v)}
        for b, v in sorted(per_borough.items())
        if len(v) >= 100
    }


if __name__ == "__main__":
    data = {
        "paris": {"source": "DVF 2024, data.gouv.fr (Licence Ouverte 2.0)", "by_postcode": paris()},
        "london": {"source": "HM Land Registry Price Paid 2024 (OGL v3.0)", "by_borough": london()},
    }
    OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False))
    p, l = data["paris"]["by_postcode"], data["london"]["by_borough"]
    print(f"Paris: {len(p)} arrondissements; London: {len(l)} boroughs")
    for k in ("75003", "75004", "75011", "75016", "75018"):
        print(k, p.get(k))
    for k in ("Camden", "Westminster", "Hackney", "Kensington And Chelsea", "Southwark"):
        print(k, l.get(k))
