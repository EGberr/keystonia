"""Real-photo media for every asset: 360° panoramas and stills from Poly Haven (CC0).

Each fictional asset gets four rooms or places that fit its type. For each one we download
the tonemapped equirectangular JPG (resized to 4096x2048 for the web tour) and, when the
capture ships with backplates, one real still photo of the same place for the cards.

    cd backend && uv run --with pillow python ../scripts/fetch_panoramas.py

Writes web/public/pano/*.jpg, web/public/img/assets/*.jpg, web/public/img/credits.json and
adds `tour` + `images` to data/catalog/assets.json.
"""

from __future__ import annotations

import io
import json
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))

ROOT = Path(__file__).resolve().parents[1]
PANO_DIR = ROOT / "web" / "public" / "pano"
IMG_DIR = ROOT / "web" / "public" / "img" / "assets"
CACHE = ROOT / "data" / "pano-src"
API = "https://api.polyhaven.com"
UA = {"User-Agent": "keystonia-portfolio-demo/1.0"}

from tours import TOURS  # noqa: E402


def get(url: str, retries: int = 3) -> bytes:
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
                return r.read()
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(2 + attempt * 3)
    raise RuntimeError(url)


def fetch_pano(pid: str) -> dict:
    files = json.loads(get(f"{API}/files/{pid}"))
    info = json.loads(get(f"{API}/info/{pid}"))
    out = PANO_DIR / f"{pid}.jpg"
    if not out.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        raw = CACHE / f"{pid}.jpg"
        if not raw.exists():
            raw.write_bytes(get(files["tonemapped"]["url"]))
        im = Image.open(raw).convert("RGB")
        im.resize((4096, 2048), Image.LANCZOS).save(out, quality=82, optimize=True, progressive=True)
        im.resize((1024, 512), Image.LANCZOS).save(PANO_DIR / f"{pid}_preview.jpg", quality=78, optimize=True)
    # One real still photo of the same place, when the capture has backplates.
    still = None
    plates = files.get("backplates") or {}
    if plates:
        name = sorted(plates)[len(plates) // 2]
        still = plates[name]["jpg_pretty"]["url"]
    return {"id": pid, "name": info.get("name", pid), "authors": list((info.get("authors") or {}).keys()), "still": still}


def still_from(meta: dict, dest: Path) -> None:
    if dest.exists():
        return
    if meta["still"]:
        im = Image.open(io.BytesIO(get(meta["still"]))).convert("RGB")
        im.thumbnail((1800, 1800), Image.LANCZOS)
    else:
        # No backplate: crop the least distorted band of the panorama (around the horizon).
        pano = Image.open(PANO_DIR / f"{meta['id']}.jpg")
        w, h = pano.size
        im = pano.crop((int(w * 0.32), int(h * 0.27), int(w * 0.68), int(h * 0.73))).resize((1800, 1150), Image.LANCZOS)
    im.save(dest, quality=84, optimize=True, progressive=True)


def main() -> None:
    PANO_DIR.mkdir(parents=True, exist_ok=True)
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    catalog_path = ROOT / "data" / "catalog" / "assets.json"
    assets = json.loads(catalog_path.read_text())
    metas: dict[str, dict] = {}
    for pid in sorted({p for rooms in TOURS.values() for p, _, _ in rooms}):
        print("pano", pid, flush=True)
        metas[pid] = fetch_pano(pid)

    credits: dict[str, dict] = {}
    for a in assets:
        rooms = TOURS[a["id"]]
        a["tour"] = [{"pano": f"/pano/{p}.jpg", "preview": f"/pano/{p}_preview.jpg", "en": en, "fr": fr} for p, en, fr in rooms]
        images = []
        for i, (pid, _, _) in enumerate(rooms[:3]):
            name = f"{a['id'].lower()}-{i}.jpg"
            still_from(metas[pid], IMG_DIR / name)
            images.append(f"/img/assets/{name}")
            credits[f"assets/{name}"] = {"file": f"assets/{name}", "title": metas[pid]["name"], "creator": ", ".join(metas[pid]["authors"]) or None, "license": "CC0 1.0", "license_url": "https://creativecommons.org/publicdomain/zero/1.0/", "source": "polyhaven", "url": f"https://polyhaven.com/a/{pid}"}
        a["images"] = images
        print("asset", a["id"], flush=True)
    for pid, m in metas.items():
        credits[f"pano/{pid}.jpg"] = {"file": f"pano/{pid}.jpg", "title": f"{m['name']} (360°)", "creator": ", ".join(m["authors"]) or None, "license": "CC0 1.0", "license_url": "https://creativecommons.org/publicdomain/zero/1.0/", "source": "polyhaven", "url": f"https://polyhaven.com/a/{pid}"}
    catalog_path.write_text(json.dumps(assets, indent=1, ensure_ascii=False))
    (ROOT / "web" / "public" / "img" / "credits.json").write_text(json.dumps(credits, indent=1, ensure_ascii=False))
    print(f"{len(metas)} panoramas, {len(assets)} assets", file=sys.stderr)


if __name__ == "__main__":
    main()
