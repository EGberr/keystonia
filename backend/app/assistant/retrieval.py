"""Section-aware retrieval over the asset document packs (BM25, contextual chunk headers)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache

import numpy as np

from app.assistant.bm25 import BM25
from app.config import settings

FRONT = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)


@dataclass
class Chunk:
    chunk_id: str
    asset_id: str
    doc: str
    title: str
    section: str
    text: str

    @property
    def contextual(self) -> str:
        return f"{self.title} — {self.section}\n{self.text}"


def _load() -> list[Chunk]:
    chunks: list[Chunk] = []
    for path in sorted((settings.catalog_dir / "docs").glob("*/*.md")):
        raw = path.read_text()
        meta = {}
        m = FRONT.match(raw)
        if m:
            meta = dict(line.split(": ", 1) for line in m.group(1).splitlines() if ": " in line)
            raw = raw[m.end() :]
        raw = re.sub(r"^# .+$", "", raw, count=1, flags=re.MULTILINE)
        raw = re.sub(r"^> \*\*Demo document\.\*\*.*$", "", raw, flags=re.MULTILINE)
        parts = re.split(r"^## (.+)$", raw, flags=re.MULTILINE)
        for i in range(1, len(parts), 2):
            section, text = parts[i].strip(), parts[i + 1].strip()
            if text:
                slug = re.sub(r"[^a-z0-9]+", "-", section.lower()).strip("-")
                chunks.append(
                    Chunk(
                        f"{meta.get('id', path.stem)}#{slug}",
                        meta.get("asset", path.parent.name),
                        path.stem,
                        meta.get("title", path.stem),
                        section,
                        text,
                    )
                )
    return chunks


class DocIndex:
    def __init__(self) -> None:
        self.chunks = _load()
        self.bm25 = BM25([c.contextual for c in self.chunks])

    def search(self, query: str, k: int = 6, asset_ids: list[str] | None = None) -> list[Chunk]:
        scores = self.bm25.scores(query)
        if asset_ids:
            allowed = {a.upper() for a in asset_ids}
            mask = np.array([c.asset_id in allowed for c in self.chunks])
            scores = np.where(mask, scores, -np.inf)
        order = [i for i in np.argsort(-scores)[:k] if np.isfinite(scores[i]) and scores[i] > 0]
        return [self.chunks[i] for i in order]


@lru_cache(maxsize=1)
def get_index() -> DocIndex:
    return DocIndex()
