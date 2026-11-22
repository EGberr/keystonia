"""Okapi BM25 with a tiny English normaliser (no external dependency)."""

from __future__ import annotations

import math
import re
from collections import Counter

import numpy as np

STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "but",
    "by",
    "can",
    "did",
    "do",
    "does",
    "for",
    "from",
    "had",
    "has",
    "have",
    "how",
    "i",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "me",
    "more",
    "most",
    "my",
    "of",
    "on",
    "or",
    "our",
    "so",
    "than",
    "that",
    "the",
    "their",
    "them",
    "then",
    "there",
    "these",
    "they",
    "this",
    "those",
    "to",
    "us",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "will",
    "with",
    "would",
    "you",
    "your",
    "about",
    "across",
    "among",
    "vs",
}
TOKEN = re.compile(r"[a-z0-9€]+(?:[-'][a-z0-9]+)*")


def _stem(tok: str) -> str:
    for suf in ("ings", "ing", "ies", "es", "s", "ed"):
        if len(tok) > len(suf) + 3 and tok.endswith(suf):
            return tok[: -len(suf)] + ("y" if suf == "ies" else "")
    return tok


def tokenize(text: str) -> list[str]:
    out = []
    for tok in TOKEN.findall(text.lower()):
        if tok in STOPWORDS:
            continue
        out.append(_stem(tok))
        if "-" in tok:  # index compound parts too: "plant-based" -> plant, based
            out.extend(_stem(p) for p in tok.split("-") if p and p not in STOPWORDS)
    return out


class BM25:
    def __init__(self, texts: list[str], k1: float = 1.4, b: float = 0.72) -> None:
        self.k1, self.b = k1, b
        self.docs = [Counter(tokenize(t)) for t in texts]
        self.lengths = np.array([sum(d.values()) for d in self.docs], dtype=float)
        self.avgdl = float(self.lengths.mean()) if len(self.docs) else 0.0
        df: Counter[str] = Counter()
        for d in self.docs:
            df.update(d.keys())
        n = len(self.docs)
        self.idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}
        # Inverted index for fast scoring.
        self.postings: dict[str, list[tuple[int, int]]] = {}
        for i, d in enumerate(self.docs):
            for t, tf in d.items():
                self.postings.setdefault(t, []).append((i, tf))

    def scores(self, query: str) -> np.ndarray:
        scores = np.zeros(len(self.docs))
        norm = self.k1 * (1 - self.b + self.b * self.lengths / (self.avgdl or 1))
        for t in set(tokenize(query)):
            idf = self.idf.get(t)
            if idf is None:
                continue
            for i, tf in self.postings[t]:
                scores[i] += idf * tf * (self.k1 + 1) / (tf + norm[i])
        return scores
