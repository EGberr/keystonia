.PHONY: install chain resume api web test lint catalog

install: ## Install every dependency (Foundry, uv and pnpm must be on PATH)
	cd contracts && forge build
	cd backend && uv sync
	cd web && pnpm install

chain: ## Fresh local chain with ~13 months of simulated history (~20 s)
	./scripts/reset-chain.sh

resume: ## Restart Anvil from the saved state
	./scripts/chain.sh

api: ## FastAPI on :8000
	cd backend && uv run uvicorn app.main:app --port 8000

web: ## Next.js on :3000
	cd web && pnpm dev

test: ## Contracts, backend (needs `make chain`) and web checks
	cd contracts && forge test
	cd backend && uv run pytest -q
	cd web && pnpm exec tsc --noEmit && pnpm lint

lint:
	cd contracts && forge fmt --check src test
	cd backend && uv run ruff check . && uv run ruff format --check .
	cd web && pnpm lint

catalog: ## Rebuild the asset catalogue and documents from scripts/catalog_spec.py
	cd backend && uv run python ../scripts/build_catalog.py
