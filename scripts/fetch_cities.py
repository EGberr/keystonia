"""City and category images cropped from Poly Haven CC0 panoramas (run after fetch_panoramas.py)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fetch_panoramas import PANO_DIR, ROOT, fetch_pano  # noqa: E402
from PIL import Image  # noqa: E402

# key -> (panorama, horizontal centre 0..1 of the view)
CITIES = {
    "categories/residential": ("combination_room", 0.5),
    "categories/hospitality": ("hotel_room", 0.5),
    "categories/commercial": ("vestibule", 0.5),
    "categories/resort": ("pool", 0.5),
    "categories/land": ("stone_pines", 0.5),
}


def main() -> None:
    credits_path = ROOT / "web" / "public" / "img" / "credits.json"
    credits = json.loads(credits_path.read_text())
    for key, (pid, cx) in CITIES.items():
        meta = fetch_pano(pid)
        pano = Image.open(PANO_DIR / f"{pid}.jpg")
        w, h = pano.size
        half = int(w * 0.17)
        left = int(w * cx) - half
        im = pano.crop((left, int(h * 0.22), left + 2 * half, int(h * 0.74))).resize((1400, 1050), Image.LANCZOS)
        dest = ROOT / "web" / "public" / "img" / f"{key}.jpg"
        dest.parent.mkdir(parents=True, exist_ok=True)
        im.save(dest, quality=84, optimize=True, progressive=True)
        old = dest.with_suffix(".webp")
        if old.exists():
            old.unlink()
        credits[f"{key}.jpg"] = {
            "file": f"{key}.jpg",
            "title": meta["name"],
            "creator": ", ".join(meta["authors"]) or None,
            "license": "CC0 1.0",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source": "polyhaven",
            "url": f"https://polyhaven.com/a/{pid}",
        }
        print(key, pid)
    credits = {
        k: v
        for k, v in credits.items()
        if (ROOT / "web" / "public" / ("img/" + k if not k.startswith("pano/") else k)).exists()
    }
    credits_path.write_text(json.dumps(credits, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
