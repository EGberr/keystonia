"""Real property photos from Pexels (free licence) for the asset pages.

Needs a free API key (https://www.pexels.com/api/). Put it in the repository's .env file:

    PEXELS_API_KEY=xxxxxxxx

Then:  cd backend && uv run --with pillow python ../scripts/fetch_pexels.py

For each asset it runs three searches built from the asset's type and city, keeps the best
landscape result not used elsewhere, saves web/public/img/assets/<id>-<n>.jpg and records the
photographer and source page in web/public/img/credits.json. Review the contact sheet it writes
(data/market/pexels_contact.jpg) and re-run with  --skip <pexels id> ...  to replace a photo.
"""

from __future__ import annotations

import io
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "web" / "public" / "img" / "assets"
SKIP_FILE = ROOT / "data" / "market" / "pexels_skip.json"

# Three shots per asset: the hero view, an interior, a detail or amenity.
QUERIES: dict[str, list[str]] = {
    "KST-NYC-001": [
        "new york penthouse living room skyline",
        "luxury penthouse interior night city view",
        "luxury apartment terrace manhattan",
    ],
    "KST-NYC-002": ["luxury hotel lobby new york", "luxury hotel suite interior", "rooftop bar manhattan night"],
    "KST-NYC-003": ["fifth avenue new york luxury store", "luxury boutique interior", "luxury store display"],
    "KST-NYC-004": [
        "apartment view central park skyline",
        "modern luxury bedroom city view",
        "luxury skyscraper pool interior",
    ],
    "KST-PAR-001": [
        "paris apartment eiffel tower terrace",
        "parisian luxury apartment interior",
        "haussmann apartment living room",
    ],
    "KST-PAR-002": [
        "paris luxury hotel facade",
        "luxury hotel suite classic interior",
        "luxury hotel garden courtyard paris",
    ],
    "KST-PAR-003": ["paris luxury boutique facade", "luxury fashion boutique interior", "place vendome paris"],
    "KST-PAR-004": [
        "paris seine apartment view",
        "classic french apartment interior moulding",
        "paris ile saint louis",
    ],
    "KST-DXB-001": [
        "dubai palm jumeirah villa beach",
        "luxury villa infinity pool sunset",
        "luxury villa interior living room sea view",
    ],
    "KST-DXB-002": [
        "dubai penthouse burj khalifa view",
        "luxury penthouse interior dubai",
        "burj khalifa night skyline",
    ],
    "KST-DXB-003": ["dubai marina hotel yachts", "luxury hotel pool dubai", "luxury yacht marina night"],
    "KST-DXB-004": ["fine dining restaurant interior luxury", "luxury restaurant table setting", "dubai difc night"],
    "KST-LON-001": [
        "chelsea london townhouse white stucco",
        "london luxury townhouse interior",
        "elegant living room fireplace london",
    ],
    "KST-LON-002": [
        "mayfair london luxury hotel",
        "luxury hotel lobby classic chandelier",
        "luxury hotel bar interior",
    ],
    "KST-LON-003": [
        "london mews houses cobbled street",
        "luxury home interior kitchen london",
        "belgravia london street",
    ],
    "KST-LON-004": ["art gallery interior white", "bond street london", "private dining room luxury"],
    "KST-RAK-001": [
        "marrakech riad courtyard pool",
        "moroccan riad interior zellige",
        "marrakech rooftop terrace sunset",
    ],
    "KST-RAK-002": [
        "marrakech luxury villa pool palm trees",
        "moroccan luxury villa interior",
        "palm grove marrakech resort",
    ],
    "KST-RAK-003": ["moroccan palace courtyard fountain", "moroccan hammam spa", "luxury moroccan suite"],
    "KST-RAK-004": ["olive grove atlas mountains morocco", "vineyard morocco", "moroccan countryside guest house"],
    "KST-MEL-001": [
        "melbourne skyline apartment view",
        "modern luxury apartment interior",
        "melbourne city botanic gardens",
    ],
    "KST-MEL-002": ["grand hotel lobby heritage", "melbourne collins street", "luxury hotel ballroom"],
    "KST-MEL-003": ["yarra valley vineyard", "winery cellar door tasting", "vineyard sunset rows"],
    "KST-MEL-004": ["coastal luxury resort villa ocean", "hot springs spa outdoor", "mornington peninsula coast"],
}


def key() -> str:
    k = os.environ.get("PEXELS_API_KEY")
    env = ROOT / ".env"
    if not k and env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("PEXELS_API_KEY="):
                k = line.split("=", 1)[1].strip().strip('"')
    if not k:
        sys.exit("PEXELS_API_KEY is missing: add it to .env (see the top of this file).")
    return k


def api(path: str, k: str) -> dict:
    req = urllib.request.Request(
        f"https://api.pexels.com/v1/{path}", headers={"Authorization": k, "User-Agent": "keystonia-demo"}
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def main() -> None:
    k = key()
    skip = set(json.loads(SKIP_FILE.read_text())) if SKIP_FILE.exists() else set()
    if "--skip" in sys.argv:
        skip |= {int(x) for x in sys.argv[sys.argv.index("--skip") + 1 :]}
        SKIP_FILE.write_text(json.dumps(sorted(skip)))
    catalog_path = ROOT / "data" / "catalog" / "assets.json"
    assets = json.loads(catalog_path.read_text())
    credits_path = ROOT / "web" / "public" / "img" / "credits.json"
    credits = json.loads(credits_path.read_text())
    used: set[int] = set()
    thumbs: list[tuple[str, Image.Image]] = []
    for a in assets:
        images = []
        for n, q in enumerate(QUERIES[a["id"]]):
            res = api(f"search?query={urllib.parse.quote(q)}&orientation=landscape&size=large&per_page=15", k)
            photo = next(
                (
                    p
                    for p in res.get("photos", [])
                    if p["id"] not in used and p["id"] not in skip and p["width"] >= 2000
                ),
                None,
            )
            if not photo:
                print("no result", a["id"], q)
                continue
            used.add(photo["id"])
            name = f"{a['id'].lower()}-{n}.jpg"
            raw = urllib.request.urlopen(
                urllib.request.Request(photo["src"]["large2x"], headers={"User-Agent": "keystonia-demo"}), timeout=120
            ).read()
            im = Image.open(io.BytesIO(raw)).convert("RGB")
            im.thumbnail((2000, 2000), Image.LANCZOS)
            im.save(IMG / name, quality=84, optimize=True, progressive=True)
            images.append(f"/img/assets/{name}")
            credits[f"assets/{name}"] = {
                "file": f"assets/{name}",
                "title": photo.get("alt") or q,
                "creator": photo["photographer"],
                "license": "Pexels License",
                "license_url": "https://www.pexels.com/license/",
                "source": "pexels",
                "url": photo["url"],
            }
            t = im.copy()
            t.thumbnail((360, 240))
            thumbs.append((f"{a['id']} #{photo['id']}", t))
        if images:
            a["images"] = images
        print(a["id"], len(images), flush=True)
    catalog_path.write_text(json.dumps(assets, indent=1, ensure_ascii=False))
    credits_path.write_text(json.dumps(credits, indent=1, ensure_ascii=False))
    cols = 6
    sheet = Image.new("RGB", (cols * 360, ((len(thumbs) + cols - 1) // cols) * 262), (14, 13, 12))
    d = ImageDraw.Draw(sheet)
    for i, (label, t) in enumerate(thumbs):
        x, y = (i % cols) * 360, (i // cols) * 262
        sheet.paste(t, (x, y))
        d.text((x + 4, y + 244), label, fill=(230, 230, 230))
    sheet.save(ROOT / "data" / "market" / "pexels_contact.jpg", quality=82)


if __name__ == "__main__":
    main()
