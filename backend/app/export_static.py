"""Snapshot every API response into web/public/demo for the static GitHub Pages build.

The public demo runs without a chain or server: the web app reads these JSON files and
simulates transactions in the browser. Run against a seeded local chain:

    uv run python -m app.export_static
"""

from __future__ import annotations

import json
import os
import shutil
import tempfile
from pathlib import Path

os.environ.setdefault("KST_DB_PATH", str(Path(tempfile.mkdtemp()) / "index.sqlite"))
os.environ["KST_OFFLINE"] = "true"

from fastapi.testclient import TestClient  # noqa: E402

from app.assistant.retrieval import get_index  # noqa: E402
from app.config import ROOT  # noqa: E402
from app.main import app  # noqa: E402

OUT = ROOT / "web" / "public" / "demo"


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "asset").mkdir(parents=True)
    (OUT / "doc").mkdir()
    (OUT / "portfolio").mkdir()

    def save(name: str, data: object) -> None:
        (OUT / name).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))

    with TestClient(app) as c:
        get = lambda path: c.get(path).raise_for_status().json()  # noqa: E731
        config = get("/api/config")
        for name, path in [
            ("config", "/api/config"),
            ("health", "/api/health"),
            ("overview", "/api/overview"),
            ("assets", "/api/assets"),
            ("market", "/api/market"),
            ("governance", "/api/governance"),
            ("requests", "/api/requests"),
            ("activity", "/api/activity?limit=60"),
        ]:
            save(f"{name}.json", get(path))
        for a in get("/api/assets"):
            aid = a["id"].lower()
            save(f"asset/{aid}.json", get(f"/api/assets/{aid}"))
            for kind in ("memorandum", "valuation", "technical", "legal"):
                (OUT / "doc" / f"{aid}-{kind}.md").write_text(c.get(f"/api/assets/{aid}/documents/{kind}").text)
        for p in config["personas"]:
            save(f"portfolio/{p['address'].lower()}.json", get(f"/api/portfolio/{p['address']}"))

    chunks = [
        {"id": ch.chunk_id, "a": ch.asset_id, "d": ch.doc, "t": ch.title, "s": ch.section, "x": ch.text}
        for ch in get_index().chunks
    ]
    save("chunks.json", chunks)
    size = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
    print(
        f"exported {sum(1 for _ in OUT.rglob('*.json'))} json files, {len(chunks)} chunks, {size / 1e6:.1f} MB -> {OUT}"
    )


if __name__ == "__main__":
    main()
