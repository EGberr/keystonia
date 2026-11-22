"""Tools for the investment assistant: document search and platform data, with citation IDs.

Passages from document packs are cited [S#]; platform data (asset facts, live offering and income
figures read from the chain index) are cited [D#].
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from pydantic import BaseModel, Field, ValidationError

from app.assistant.retrieval import get_index
from app.services import Platform, catalog

ASSET_IDS = [a["id"] for a in catalog()]
FACT_KEYS = (
    "id",
    "name",
    "city_name",
    "district",
    "category",
    "layout",
    "surface_m2",
    "year_built",
    "energy_rating",
    "operator",
    "occupancy_pct",
    "valuation_eur",
    "share_price_eur",
    "total_shares",
    "offered_shares",
    "gross_yield_pct",
    "net_yield_pct",
    "annual_noi_eur",
    "monthly_distribution_eur",
    "phase",
    "progress_pct",
    "investors",
    "holders",
    "income_distributed_eur",
    "income_months",
    "last_trade_price_eur",
    "ends_at",
)


class SearchInput(BaseModel):
    query: str = Field(min_length=2, max_length=300)
    asset_ids: list[str] | None = None
    k: int = Field(default=6, ge=1, le=10)


class AssetInput(BaseModel):
    asset_id: str


class ListInput(BaseModel):
    city: Literal["newyork", "paris", "dubai", "london", "marrakech", "melbourne"] | None = None
    category: Literal["residential", "hospitality", "commercial", "resort", "land"] | None = None
    phase: Literal["live", "funded", "upcoming"] | None = None
    sort_by: Literal["net_yield_pct", "valuation_eur", "progress_pct", "income_distributed_eur"] = "net_yield_pct"


class CompareInput(BaseModel):
    asset_ids: list[str] = Field(min_length=2, max_length=5)


TOOLS: list[dict[str, Any]] = [
    {
        "name": "search_documents",
        "description": (
            "Search the document packs of the assets (investment memorandum, valuation report, technical "
            "survey, legal structure). Returns passages with citation IDs (S1, S2...). Use it for risks, "
            "valuation method, legal structure, energy rating and building condition."
        ),
        "eager_input_streaming": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "asset_ids": {
                    "type": "array",
                    "items": {"type": "string", "enum": ASSET_IDS},
                },
                "k": {"type": "integer", "minimum": 1, "maximum": 10},
            },
            "required": ["query"],
            "additionalProperties": False,
        },
    },
    {
        "name": "get_asset",
        "description": (
            "Key facts and live on-chain figures for one asset: valuation, share price, yields, occupancy, "
            "offering progress, investors, income distributed so far, last secondary-market price. Returns a "
            "dataset citation ID (D1...)."
        ),
        "eager_input_streaming": True,
        "input_schema": {
            "type": "object",
            "properties": {"asset_id": {"type": "string", "enum": ASSET_IDS}},
            "required": ["asset_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "list_assets",
        "description": "List assets filtered by city, category and phase (live sale, funded, upcoming), sorted.",
        "eager_input_streaming": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "enum": ["newyork", "paris", "dubai", "london", "marrakech", "melbourne"],
                },
                "category": {
                    "type": "string",
                    "enum": [
                        "residential",
                        "hospitality",
                        "commercial",
                        "resort",
                        "land",
                    ],
                },
                "phase": {"type": "string", "enum": ["live", "funded", "upcoming"]},
                "sort_by": {
                    "type": "string",
                    "enum": [
                        "net_yield_pct",
                        "valuation_eur",
                        "progress_pct",
                        "income_distributed_eur",
                    ],
                },
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "compare_assets",
        "description": "Side-by-side comparison of 2 to 5 assets on yield, valuation, occupancy and funding.",
        "eager_input_streaming": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "asset_ids": {
                    "type": "array",
                    "items": {"type": "string", "enum": ASSET_IDS},
                    "minItems": 2,
                    "maxItems": 5,
                }
            },
            "required": ["asset_ids"],
            "additionalProperties": False,
        },
    },
]
TOOLS[-1]["cache_control"] = {"type": "ephemeral"}


class ToolError(Exception):
    pass


@dataclass
class Sources:
    passages: dict[str, str] = field(default_factory=dict)
    datasets: int = 0

    def passage(self, chunk_id: str) -> tuple[str, bool]:
        if chunk_id in self.passages:
            return self.passages[chunk_id], False
        sid = f"S{len(self.passages) + 1}"
        self.passages[chunk_id] = sid
        return sid, True

    def dataset(self) -> str:
        self.datasets += 1
        return f"D{self.datasets}"


class Toolbox:
    def __init__(self, platform: Platform) -> None:
        self.platform = platform

    def run(self, name: str, raw: Any, src: Sources) -> tuple[dict, list[dict]]:
        try:
            if name == "search_documents":
                return self._search(SearchInput.model_validate(raw), src)
            if name == "get_asset":
                return self._asset(AssetInput.model_validate(raw), src)
            if name == "list_assets":
                return self._list(ListInput.model_validate(raw or {}), src)
            if name == "compare_assets":
                return self._compare(CompareInput.model_validate(raw), src)
        except ValidationError as exc:
            raise ToolError(f"Invalid input for {name}: {exc.errors(include_url=False)}") from exc
        raise ToolError(f"Unknown tool {name}")

    def _search(self, inp: SearchInput, src: Sources):
        hits = get_index().search(inp.query, inp.k, inp.asset_ids)
        events, passages = [], []
        for h in hits:
            sid, new = src.passage(h.chunk_id)
            if new:
                events.append(
                    {
                        "type": "source",
                        "source": {
                            "id": sid,
                            "kind": "passage",
                            "asset_id": h.asset_id,
                            "doc": h.doc,
                            "title": h.title,
                            "section": h.section,
                            "text": h.text,
                        },
                    }
                )
            passages.append({"id": sid, "document": h.title, "section": h.section, "text": h.text})
        return {"passages": passages}, events + [{"type": "tool_summary", "summary": f"{len(passages)} passages"}]

    def _facts(self, asset_id: str) -> dict[str, Any]:
        a = self.platform.asset(asset_id)
        if not a:
            raise ToolError(f"Unknown asset {asset_id}")
        return {k: a.get(k) for k in FACT_KEYS}

    def _dataset(self, src: Sources, title: str, rows: list[dict]) -> tuple[dict, list[dict]]:
        did = src.dataset()
        payload = {"id": did, "title": title, "rows": rows}
        return payload, [
            {"type": "dataset", "dataset": payload},
            {"type": "tool_summary", "summary": f"{did}: {title}"},
        ]

    def _asset(self, inp: AssetInput, src: Sources):
        facts = self._facts(inp.asset_id)
        return self._dataset(src, f"{facts['name']} — key facts", [facts])

    def _list(self, inp: ListInput, src: Sources):
        items = self.platform.assets(inp.city, inp.category, inp.phase)
        items.sort(key=lambda a: -(a.get(inp.sort_by) or 0))
        rows = [
            {
                k: a.get(k)
                for k in (
                    "id",
                    "name",
                    "city_name",
                    "category",
                    "phase",
                    "valuation_eur",
                    "net_yield_pct",
                    "progress_pct",
                    "share_price_eur",
                )
            }
            for a in items
        ]
        return self._dataset(src, f"Assets ({len(rows)})", rows)

    def _compare(self, inp: CompareInput, src: Sources):
        rows = [self._facts(i) for i in inp.asset_ids]
        return self._dataset(src, "Comparison", rows)
