"""Keystonia HTTP API. Run: uv run uvicorn app.main:app --port 8000"""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from app import demo
from app.assistant.agent import ClaudeAssistant, OfflineAssistant
from app.assistant.tools import Toolbox
from app.chain import chain_time, deployment, w3
from app.config import settings
from app.indexer import get_indexer
from app.services import Platform, categories, cities

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("keystonia")


@asynccontextmanager
async def lifespan(app: FastAPI):
    ix = get_indexer()
    n = ix.sync()
    log.info("Indexed %d events up to block %s", n, ix.meta("last_block"))
    ix.start(interval=1.0)
    app.state.platform = Platform(ix)
    app.state.toolbox = Toolbox(app.state.platform)
    yield
    ix.stop()


app = FastAPI(title="Keystonia API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def platform() -> Platform:
    return app.state.platform


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=20_000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)
    asset_id: str | None = None
    lang: Literal["en", "fr"] = "en"


class WalletBody(BaseModel):
    wallet: str = Field(pattern=r"^0x[a-fA-F0-9]{40}$")


class KycBody(WalletBody):
    country: int = Field(ge=1, le=999)


class FaucetBody(WalletBody):
    amount_eur: int = Field(default=10_000, ge=1, le=100_000)


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "chain_id": w3().eth.chain_id,
        "block": w3().eth.block_number,
        "chain_time": chain_time(),
        "indexed_block": get_indexer().meta("last_block"),
        "assistant": "claude" if settings.llm_enabled else "offline",
        "demo_controls": settings.demo_controls,
    }


@app.get("/api/config")
def config() -> dict[str, Any]:
    dep = deployment()
    return {
        "chainId": dep["chainId"],
        "rpcUrl": settings.rpc_url,
        "contracts": dep["contracts"],
        "demoAccount": dep["demoAccount"],
        "personas": [{"address": k, **v} for k, v in dep["accounts"].items() if v["role"] in ("investor", "issuer")],
    }


@app.get("/api/overview")
def overview() -> dict[str, Any]:
    return platform().overview()


@app.get("/api/cities")
def list_cities() -> dict[str, Any]:
    return cities()


@app.get("/api/categories")
def list_categories() -> dict[str, Any]:
    return categories()


@app.get("/api/assets")
def assets(
    city: str | None = None,
    category: str | None = None,
    phase: Literal["live", "funded", "upcoming", "closing", "refunded"] | None = None,
) -> list[dict[str, Any]]:
    return platform().assets(city, category, phase)


@app.get("/api/assets/{asset_id}")
def asset(asset_id: str) -> dict[str, Any]:
    data = platform().asset(asset_id)
    if not data:
        raise HTTPException(404, "Unknown asset")
    return data


@app.get("/api/assets/{asset_id}/documents/{kind}", response_class=PlainTextResponse)
def document(asset_id: str, kind: Literal["memorandum", "valuation", "technical", "legal"]) -> str:
    text = platform().document(asset_id, kind)
    if text is None:
        raise HTTPException(404, "Unknown document")
    return text


@app.get("/api/portfolio/{wallet}")
def portfolio(wallet: str) -> dict[str, Any]:
    if not wallet.startswith("0x") or len(wallet) != 42:
        raise HTTPException(400, "Invalid wallet")
    return platform().portfolio(w3().to_checksum_address(wallet))


@app.get("/api/market")
def market() -> dict[str, Any]:
    return platform().market()


@app.get("/api/governance")
def governance() -> list[dict[str, Any]]:
    return platform().proposals()


@app.get("/api/requests")
def requests() -> list[dict[str, Any]]:
    return platform().requests()


@app.get("/api/activity")
def activity(limit: int = 40) -> list[dict[str, Any]]:
    return platform().activity(min(limit, 200))


# ── demo controls (local chain only) ─────────────────────────────────────────
def _guard() -> None:
    if not settings.demo_controls:
        raise HTTPException(403, "Demo controls are disabled")


@app.post("/api/demo/kyc")
def demo_kyc(body: KycBody) -> dict[str, str]:
    _guard()
    return {"tx": demo.verify_identity(body.wallet, body.country)}


@app.post("/api/demo/faucet")
def demo_faucet(body: FaucetBody) -> dict[str, str]:
    _guard()
    return {"tx": demo.faucet(body.wallet, body.amount_eur)}


@app.post("/api/demo/advance-month")
def demo_advance() -> dict[str, Any]:
    _guard()
    result = demo.advance_month()
    get_indexer().sync()
    return result


@app.post("/api/assistant")
async def assistant(req: ChatRequest, request: Request):
    toolbox = request.app.state.toolbox
    bot = ClaudeAssistant(toolbox) if settings.llm_enabled else OfflineAssistant(toolbox)
    history = [m.model_dump() for m in req.messages]

    async def gen():
        try:
            async for event in bot.run(history, scope=req.asset_id, lang=req.lang):
                if await request.is_disconnected():
                    break
                yield {"data": json.dumps(event, ensure_ascii=False, default=str)}
        except Exception:  # never leak a stack trace into the stream
            log.exception("assistant failed")
            yield {"data": json.dumps({"type": "error", "message": "Internal error while answering."})}

    return EventSourceResponse(gen(), ping=15)
