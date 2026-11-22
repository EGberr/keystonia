"""Runtime configuration (environment variables prefixed with KST_)."""

from __future__ import annotations

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="KST_", env_file=ROOT / ".env", extra="ignore")

    rpc_url: str = "http://127.0.0.1:8545"
    chain_id: int = 31337
    data_dir: Path = ROOT / "data"
    contracts_out: Path = ROOT / "contracts" / "out"
    db_path: Path = ROOT / "data" / "chain" / "index.sqlite"
    model: str = "claude-opus-5-5"
    effort: str = "medium"
    cors_origins: list[str] = ["http://localhost:3000"]
    demo_controls: bool = True  # time travel and faucet endpoints (local chain only)
    offline: bool = False

    @property
    def deployment_file(self) -> Path:
        return self.data_dir / "chain" / "deployment.json"

    @property
    def catalog_dir(self) -> Path:
        return self.data_dir / "catalog"

    @property
    def llm_enabled(self) -> bool:
        if self.offline:
            return False
        return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))


settings = Settings()
