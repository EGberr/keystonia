"""BM25 retrieval over the asset documents."""

from __future__ import annotations

from app.assistant.bm25 import BM25, tokenize
from app.assistant.retrieval import get_index


def test_tokenize_folds_accents_and_case():
    assert tokenize("Évaluation RIADS") == tokenize("evaluation riad")


def test_bm25_ranks_the_matching_text_first():
    bm = BM25(["rooftop terrace with atlas views", "student residence near campus", "vineyard land in the douro"])
    scores = bm.scores("student campus")
    assert scores.argmax() == 1


def test_index_covers_every_document():
    ix = get_index()
    assert len({c.asset_id for c in ix.chunks}) == 24
    assert {c.doc for c in ix.chunks} >= {"memorandum", "valuation", "technical", "legal"}


def test_search_respects_asset_scope():
    hits = get_index().search("main risks", k=5, asset_ids=["KST-RAK-001"])
    assert hits
    assert all(h.asset_id == "KST-RAK-001" for h in hits)


def test_search_finds_the_valuation_report():
    hits = get_index().search("comparable sales valuation method", k=3, asset_ids=["KST-PAR-001"])
    assert any(h.doc == "valuation" for h in hits)
