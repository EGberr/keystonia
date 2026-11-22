"""Fetches openly licensed photography for assets, cities and categories (Openverse API).

Sources: StockSnap (modern CC0 photography) first, Rawpixel modern stock photos (CC0) for places StockSnap
does not cover (Morocco, Lisbon). Archival artwork, illustrations and visible brands are filtered out.
Asset pictures illustrate the asset type (facade, interior, detail); assets are fictional, so pictures are
representative, not photos of a real property. Every image is credited in web/public/img/credits.json.

Run: uv run --with pillow python scripts/fetch_images.py [--pick stem=candidate-index ...]
"""

import argparse
import io
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from catalog_spec import ASSETS, CATEGORIES, CITIES  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "public" / "img"
CACHE = ROOT / "data" / "market" / "image_pools.json"
API = "https://api.openverse.org/v1/images/"
UA = "KeystoniaPortfolio/1.0 (open-source demo)"
BANNED = re.compile(
    r"illustration|vintage|drawing|engraving|etching|painting|antique|clip ?art|vector|icon|logo|sticker|poster|"
    r"lithograph|museum|century|print|cartoon|png|sketch|map|flag|costume|\(\d{4}|\d{4}\)|series|psd|mockup|"
    r"template|pattern|texture|background|wallpaper|child|kid|baby|woman|man |men |people|girl|boy|selfie"
)

# (source, query) pools. Several queries per theme give enough distinct pictures.
POOLS = {
    "facade": [("stocksnap", "facade"), ("stocksnap", "building")],
    "living": [("stocksnap", "living room"), ("stocksnap", "interior"), ("stocksnap", "apartment")],
    "detail": [("stocksnap", "kitchen"), ("stocksnap", "bedroom")],
    "hotel": [("stocksnap", "hotel"), ("stocksnap", "hotel room")],
    "pool": [("stocksnap", "pool"), ("stocksnap", "resort"), ("stocksnap", "terrace")],
    "office": [("stocksnap", "office"), ("stocksnap", "workspace")],
    "shop": [("stocksnap", "shop"), ("stocksnap", "store")],
    "desk": [("stocksnap", "desk")],
    "land": [("stocksnap", "vineyard"), ("stocksnap", "olive"), ("stocksnap", "garden")],
    "morocco": [("rawpixel", "marrakech"), ("rawpixel", "moroccan architecture"), ("rawpixel", "morocco")],
    "lisbon": [("rawpixel", "lisbon"), ("stocksnap", "lisbon")],
    "paris": [("stocksnap", "paris")],
    "london": [("stocksnap", "london")],
}

# Which pools illustrate each asset: (cover, interior, detail).
ASSET_THEMES = {
    "residential": ("facade", "living", "detail"),
    "hospitality": ("hotel", "pool", "hotel"),
    "commercial": ("shop", "office", "office"),
    "student": ("facade", "desk", "detail"),
    "land": ("land", "land", "land"),
}
FALLBACK = {"morocco": "pool", "lisbon": "facade", "desk": "living", "shop": "office"}
CITY_COVER = {"marrakech": "morocco", "lisbon": "lisbon", "paris": "paris", "london": "london"}
CATEGORY_POOL = {
    "residential": "living",
    "hospitality": "hotel",
    "commercial": "office",
    "student": "desk",
    "land": "land",
}


def search(source: str, query: str, page: int) -> list[dict]:
    params = {
        "q": query,
        "source": source,
        "license": "cc0,pdm,by,by-sa",
        "page_size": 20,
        "page": page,
        "mature": "false",
    }
    req = urllib.request.Request(f"{API}?{urllib.parse.urlencode(params)}", headers={"User-Agent": UA})
    data: dict = {}
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                time.sleep(10 * (attempt + 1))
                continue
            raise
    time.sleep(3.2)
    out = []
    for r in data.get("results") or []:
        title = (r.get("title") or "").lower()
        if not r.get("width") or r["width"] < 1000 or BANNED.search(title):
            continue
        if source == "rawpixel" and not re.search(r"photo|image|view|architecture|street|tram|courtyard", title):
            continue  # rawpixel also hosts digitised artwork; keep its photographs only
        out.append(
            {
                k: r.get(k)
                for k in (
                    "id",
                    "title",
                    "creator",
                    "license",
                    "license_version",
                    "license_url",
                    "source",
                    "url",
                    "foreign_landing_url",
                    "width",
                    "height",
                )
            }
        )
    return out


def pool(name: str, cache: dict) -> list[dict]:
    if name not in cache:
        items, seen = [], set()
        for source, query in POOLS[name]:
            for page in (1, 2):
                for c in search(source, query, page):
                    if c["id"] not in seen:
                        seen.add(c["id"])
                        items.append(c)
        cache[name] = items
        CACHE.write_text(json.dumps(cache, indent=1))
        print(f"pool {name}: {len(items)}")
    return cache[name]


def download(url: str, max_w: int, dest: Path) -> bool:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            img = Image.open(io.BytesIO(r.read())).convert("RGB")
    except Exception as exc:  # noqa: BLE001
        print(f"  ! {url[:70]}: {exc}")
        return False
    saturation = sum(img.convert("HSV").resize((64, 64)).getchannel("S").getdata()) / (64 * 64 * 255)
    if saturation < 0.12:  # black-and-white or washed-out shots look archival next to colour photography
        print(f"  - skip low-saturation picture {url[:60]}")
        return False
    if img.width > max_w:
        img = img.resize((max_w, round(img.height * max_w / img.width)), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=80, method=6)
    return True


def credit(c: dict, file: str) -> dict:
    return {
        "file": file,
        "title": c["title"],
        "creator": c["creator"],
        "license": f"{c['license'].upper()} {c.get('license_version') or ''}".strip(),
        "license_url": c["license_url"],
        "source": c["source"],
        "url": c["foreign_landing_url"],
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pick", nargs="*", default=[], help="stem=pool:index overrides, e.g. kst-par-001-0=facade:7")
    ap.add_argument("--next", nargs="*", default=[], help="stems whose current picture should be replaced")
    args = ap.parse_args()
    picks = dict(p.split("=") for p in args.pick)
    rejected_path = CACHE.with_name("image_rejected.json")
    rejected: set[str] = set(json.loads(rejected_path.read_text())) if rejected_path.exists() else set()
    if args.next:
        current = json.loads((OUT / "credits.json").read_text())
        for stem in args.next:
            for file, c in current.items():
                if file.endswith(f"/{stem}.webp"):
                    rejected.add(c["url"])
        rejected_path.write_text(json.dumps(sorted(rejected), indent=1))
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}

    jobs: list[tuple[str, str, int]] = []  # (file stem, pool, width)
    for k in CITIES:
        jobs.append((f"cities/{k}", CITY_COVER[k], 1800))
    for k in CATEGORIES:
        jobs.append((f"categories/{k}", CATEGORY_POOL[k], 1400))
    for a in ASSETS:
        themes = list(ASSET_THEMES[a["category"]])
        if a["city"] == "marrakech" and a["category"] != "land":
            themes[0] = "morocco"
        for i, theme in enumerate(themes):
            jobs.append((f"assets/{a['id'].lower()}-{i}", theme, 1400))

    old = OUT / "credits.json"
    previous = json.loads(old.read_text()) if old.exists() else {}
    credits: dict = {}
    used: set[str] = set()
    cursor: dict[str, int] = {}
    for stem, theme, width in jobs:
        file = f"{stem}.webp"
        if stem.split("/")[-1] in picks:
            p, idx = picks[stem.split("/")[-1]].split(":")
            chosen = [pool(p, cache)[int(idx)]]
        else:
            items = pool(theme, cache)
            start = cursor.get(theme, 0)
            fallback = FALLBACK.get(theme)
            chosen = items[start:] + items[:start] + (pool(fallback, cache) if fallback else [])
        for c in chosen:
            if c["id"] in used or c["foreign_landing_url"] in rejected:
                continue
            prev = previous.get(file)
            if prev and prev["url"] == c["foreign_landing_url"] and (OUT / file).exists():
                ok = True
            else:
                ok = download(c["url"], width, OUT / file)
            if ok:
                used.add(c["id"])
                credits[file] = credit(c, file)
                cursor[theme] = (cache[theme].index(c) + 1) if c in cache.get(theme, []) else cursor.get(theme, 0)
                break
        else:
            print(f"  ! no image for {stem}")
    old.write_text(json.dumps(dict(sorted(credits.items())), indent=1, ensure_ascii=False))
    print(f"{len(credits)} images credited")


if __name__ == "__main__":
    main()
