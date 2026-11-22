"""Investment assistant: a Claude tool loop streamed as events, with a deterministic offline fallback."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from collections.abc import AsyncIterator
from typing import Any

import anthropic

from app.assistant.retrieval import get_index
from app.assistant.tools import TOOLS, Sources, Toolbox, ToolError
from app.config import settings
from app.services import catalog

log = logging.getLogger(__name__)
FALLBACK_BETA = "server-side-fallback-2026-07-01"
MAX_TURNS = 8
Event = dict[str, Any]

SYSTEM_PROMPT = """\
You are the Keystonia investment analyst. Keystonia is a demonstration platform where real-world assets \
(residences, five-star hotels and riads, flagship retail, resorts, estates) in New York, Paris, Dubai, London, Marrakech and Melbourne are tokenized into \
shares, sold in all-or-nothing offerings and traded on a secondary market. Shares pay monthly income on-chain.

Help investors understand an asset or compare assets. Use the tools: get_asset / list_assets / \
compare_assets for figures (they return dataset IDs like D1) and search_documents for risks, valuation method, \
legal structure and building condition (passages S1, S2...). Every figure must come from a tool. Cite right after \
each claim, e.g. "net yield 5.0% [D1]", "currency risk on dirham revenue [S2]".

Answer with: a one-sentence verdict-style summary (not personalised financial advice), the key figures, the \
main risks, and what to check before investing. Use euros with the € sign. Keep it under about 300 words and \
reply in the user's language. Say clearly that this is a demo with fictional assets if asked about investing \
real money; never recommend a personal investment amount.
"""

TOOL_LABELS = {
    "search_documents": "Reading the document packs",
    "get_asset": "Reading on-chain figures",
    "list_assets": "Screening assets",
    "compare_assets": "Comparing assets",
}


def _messages(history: list[dict[str, str]], scope: str | None, lang: str) -> list[dict[str, Any]]:
    msgs: list[dict[str, Any]] = []
    for m in history:
        role, content = m.get("role"), (m.get("content") or "").strip()
        if role not in ("user", "assistant") or not content:
            continue
        if msgs and msgs[-1]["role"] == role:
            msgs[-1]["content"] += "\n\n" + content
        else:
            msgs.append({"role": role, "content": content})
    while msgs and msgs[0]["role"] != "user":
        msgs.pop(0)
    if msgs and msgs[-1]["role"] == "user":
        notes = []
        if scope:
            notes.append(f"I am looking at asset {scope}; focus on it unless I ask about others.")
        if lang == "fr":
            notes.append("Answer in French.")
        if notes:
            msgs[-1]["content"] += "\n\n(Context: " + " ".join(notes) + ")"
    return msgs


class ClaudeAssistant:
    def __init__(self, toolbox: Toolbox, client: anthropic.AsyncAnthropic | None = None) -> None:
        self.toolbox = toolbox
        self.client = client or anthropic.AsyncAnthropic()
        self.use_fallbacks = True

    def _request(self, messages: list[dict[str, Any]]) -> dict[str, Any]:
        kwargs: dict[str, Any] = {
            "model": settings.model,
            "max_tokens": 16000,
            "system": SYSTEM_PROMPT,
            "tools": TOOLS,
            "messages": messages,
            "thinking": {"type": "adaptive"},
            "output_config": {"effort": settings.effort},
            "cache_control": {"type": "ephemeral"},
        }
        if self.use_fallbacks:
            kwargs |= {"betas": [FALLBACK_BETA], "fallbacks": "default"}
        return kwargs

    async def run(self, history, scope: str | None = None, lang: str = "en") -> AsyncIterator[Event]:
        messages = _messages(history, scope, lang)
        if not messages or messages[-1]["role"] != "user":
            yield {
                "type": "error",
                "message": "The last message must come from the user.",
            }
            return
        src = Sources()
        usage = {"input_tokens": 0, "output_tokens": 0, "cache_read_input_tokens": 0}
        t0 = time.perf_counter()
        response = None
        yield {"type": "status", "text": "Planning the analysis"}
        for turn in range(MAX_TURNS):
            try:
                async with self.client.beta.messages.stream(**self._request(messages)) as stream:
                    async for event in stream:
                        if event.type == "text":
                            yield {"type": "text", "delta": event.text}
                        elif event.type == "content_block_start" and event.content_block.type == "tool_use":
                            yield {
                                "type": "status",
                                "text": TOOL_LABELS.get(event.content_block.name, "Working"),
                            }
                    response = await stream.get_final_message()
            except ValueError:
                if turn + 1 < MAX_TURNS:
                    continue
                raise
            except anthropic.BadRequestError as exc:
                if self.use_fallbacks and "fallback" in str(exc).lower():
                    self.use_fallbacks = False
                    continue
                log.error("Claude API rejected the request: %s", exc)
                yield {
                    "type": "error",
                    "message": "Claude API rejected the request (400).",
                }
                return
            except anthropic.RateLimitError:
                yield {
                    "type": "error",
                    "message": "Rate limited by the Claude API. Please retry shortly.",
                }
                return
            except anthropic.AuthenticationError:
                yield {
                    "type": "error",
                    "message": "Invalid Anthropic credentials on the server.",
                }
                return
            except anthropic.APIStatusError as exc:
                yield {
                    "type": "error",
                    "message": f"Claude API error ({exc.status_code}).",
                }
                return
            except anthropic.APIConnectionError:
                yield {"type": "error", "message": "Could not reach the Claude API."}
                return
            for key in usage:
                usage[key] += getattr(response.usage, key, 0) or 0
            if response.stop_reason == "refusal":
                yield {"type": "error", "message": "The model declined this request."}
                return
            if response.stop_reason == "pause_turn":
                messages.append({"role": "assistant", "content": response.content})
                continue
            tool_uses = [b for b in response.content if b.type == "tool_use"]
            if not tool_uses:
                break
            if response.stop_reason == "max_tokens":
                yield {
                    "type": "error",
                    "message": "The answer was cut off (max tokens).",
                }
                return
            messages.append({"role": "assistant", "content": response.content})
            results = []
            for block in tool_uses:
                result, events, is_error = await self._exec(block, src)
                yield {
                    "type": "tool_call",
                    "id": block.id,
                    "name": block.name,
                    "input": block.input,
                    "is_error": is_error,
                    "summary": next(
                        (e["summary"] for e in events if e["type"] == "tool_summary"),
                        "",
                    ),
                }
                for e in events:
                    if e["type"] != "tool_summary":
                        yield e
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "is_error": is_error,
                        "content": json.dumps(result, ensure_ascii=False, default=str),
                    }
                )
            messages.append({"role": "user", "content": results})
            yield {"type": "status", "text": "Writing the answer"}
        else:
            yield {
                "type": "error",
                "message": "Stopped after the maximum number of steps.",
            }
        yield {
            "type": "done",
            "mode": "claude",
            "model": response.model if response else settings.model,
            "usage": usage,
            "latency_ms": int((time.perf_counter() - t0) * 1000),
        }

    async def _exec(self, block, src: Sources):
        if not isinstance(block.input, dict):
            return (
                {"error": "INVALID_JSON"},
                [{"type": "tool_summary", "summary": "invalid input"}],
                True,
            )
        try:
            result, events = await asyncio.to_thread(self.toolbox.run, block.name, block.input, src)
            return result, events, False
        except ToolError as exc:
            return (
                {"error": str(exc)},
                [{"type": "tool_summary", "summary": f"error: {exc}"[:160]}],
                True,
            )


def _detect_asset(text: str) -> str | None:
    t = text.lower()
    for a in catalog():
        if a["id"].lower() in t or a["name"].lower() in t or a["name_fr"].lower() in t:
            return a["id"]
    return None


class OfflineAssistant:
    """Rule-based fallback with the same tools and event stream (no API key needed)."""

    def __init__(self, toolbox: Toolbox) -> None:
        self.toolbox = toolbox

    async def _tool(self, name: str, inp: dict, src: Sources):
        result, events = self.toolbox.run(name, inp, src)
        summary = next((e["summary"] for e in events if e["type"] == "tool_summary"), "")
        out = [
            {
                "type": "tool_call",
                "id": f"off_{name}_{src.datasets}_{len(src.passages)}",
                "name": name,
                "input": inp,
                "is_error": False,
                "summary": summary,
            }
        ]
        out += [e for e in events if e["type"] != "tool_summary"]
        await asyncio.sleep(0.05)
        return result, out

    async def run(self, history, scope: str | None = None, lang: str = "en") -> AsyncIterator[Event]:
        question = next((m["content"] for m in reversed(history) if m.get("role") == "user"), "")
        fr = lang == "fr"
        t0 = time.perf_counter()
        src = Sources()
        yield {"type": "status", "text": "Planning the analysis"}
        asset_id = _detect_asset(question) or scope
        lines: list[str] = []
        if asset_id:
            facts, evs = await self._tool("get_asset", {"asset_id": asset_id}, src)
            for e in evs:
                yield e
            docs, evs = await self._tool(
                "search_documents",
                {
                    "query": f"{question} risks valuation",
                    "asset_ids": [asset_id],
                    "k": 4,
                },
                src,
            )
            for e in evs:
                yield e
            f = facts["rows"][0]
            d = facts["id"]
            if fr:
                lines.append(
                    f"**{f['name']}** ({f['city_name']}) : rendement net de {f['net_yield_pct']}% [{d}], "
                    f"valorisé {f['valuation_eur']:,.0f} € pour des parts à {f['share_price_eur']} € [{d}]."
                )
                lines.append(f"- Occupation : {f['occupancy_pct']}% · Exploitant : {f['operator']} [{d}]")
                lines.append(f"- Levée : {f['progress_pct']}% financée, {f['investors']} investisseurs [{d}]")
                if f["income_distributed_eur"]:
                    lines.append(
                        f"- Revenus déjà distribués : {f['income_distributed_eur']:,.0f} € sur "
                        f"{f['income_months']} mois [{d}]"
                    )
                lines.append("\n### Ce que disent les documents")
            else:
                lines.append(
                    f"**{f['name']}** ({f['city_name']}): {f['net_yield_pct']}% net yield [{d}], valued at "
                    f"€{f['valuation_eur']:,.0f} with shares at €{f['share_price_eur']} [{d}]."
                )
                lines.append(f"- Occupancy: {f['occupancy_pct']}% · Operator: {f['operator']} [{d}]")
                lines.append(f"- Offering: {f['progress_pct']}% funded by {f['investors']} investors [{d}]")
                if f["income_distributed_eur"]:
                    lines.append(
                        f"- Income paid so far: €{f['income_distributed_eur']:,.0f} over "
                        f"{f['income_months']} months [{d}]"
                    )
                lines.append("\n### What the documents say")
            for p in docs["passages"][:3]:
                text = re.sub(r"\s+", " ", p["text"])[:260]
                lines.append(f"- *{p['section']}*: {text} [{p['id']}]")
        else:
            data, evs = await self._tool("list_assets", {"phase": "live", "sort_by": "net_yield_pct"}, src)
            for e in evs:
                yield e
            d = data["id"]
            lines.append(
                f"**Offres en cours, par rendement net** [{d}] :"
                if fr
                else f"**Open offerings ranked by net yield** [{d}]:"
            )
            for r in data["rows"][:6]:
                lines.append(f"{r['name']} ({r['city_name']}) — {r['net_yield_pct']}% · {r['progress_pct']}%")
        lines.append(
            "\n*"
            + (
                "Mode hors ligne : réponse assemblée par règles. Configurez ANTHROPIC_API_KEY pour l'analyste Claude."
                if fr
                else "Offline mode: answer assembled by rules. Set ANTHROPIC_API_KEY for the Claude analyst."
            )
            + "*"
        )
        yield {"type": "status", "text": "Writing the answer"}
        for piece in re.findall(r"\S+\s*|\n", "\n".join(lines)):
            yield {"type": "text", "delta": piece}
            await asyncio.sleep(0.004)
        yield {
            "type": "done",
            "mode": "offline",
            "model": "offline",
            "usage": {},
            "latency_ms": int((time.perf_counter() - t0) * 1000),
        }


def get_index_size() -> int:
    return len(get_index().chunks)
