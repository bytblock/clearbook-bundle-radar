# Clearbook Bundle Radar (PAPER EOD POC)

**$0 · PAPER-first · architecture + action-layer proof E2E**

Observability scaffold that merges **simulated** private-bundle-like events with optional public RPC and Flashbots MEV-Share listen-only hints into one schema, serves them over HTTP/WS, and renders a live dashboard — plus an **execution / action layer** that defaults to **PAPER** fills and only proposes **unsigned** MetaMask intents when LIVE is explicitly gated.

> **Ethos:** This does **not** grant Titan/Beaver private orderflow. Commercial access is required for real private streams. Never stores private keys. Simulated data is labeled `kind=simulated`. **Do not sandwich Clearbook users.** Paper EV / PnL is a **PLACEHOLDER**, not promised alpha. **Sim OF ≠ real private OF.** Not production.

See [`03-ARCHITECTURE.md`](./03-ARCHITECTURE.md) and [`04-ACTION-LAYER.md`](./04-ACTION-LAYER.md).

---

## Quick start

```bash
cd digital-empire/clearbook/mev/bundle-radar
npm install
npm run build
```

### Two terminals (recommended for UI)

**Terminal A — aggregator (port 8787):**
```bash
npm run start:aggregator
# or hot-reload: npm run dev:aggregator
```

**Terminal B — dashboard (port 5173):**
```bash
npm run dev:dashboard
```

Open http://127.0.0.1:5173 — banner must read PAPER POC. Mode badge defaults to **PAPER**. LIVE toggle is **disabled** unless server `/health.allowLive` is true (`ALLOW_LIVE=1`).

### One-shot demos

```bash
npm run demo          # health + events
npm run demo:action   # signals + actions + pnl/summary
```

---

## Environment (all optional)

| Var | Default | Meaning |
|-----|---------|---------|
| `PORT` | `8787` | Aggregator listen port |
| `ETH_RPC_URL` | unset | Public HTTPS JSON-RPC; if unset, public adapter **no-ops** with a log |
| `MEV_SHARE_SSE_URL` | `https://mev-share.flashbots.net` | Public SSE (listen-only, no key) |
| `SKIP_MEV_SHARE` | unset | Set `1` to force hint placeholders without connecting |
| `EXECUTION_MODE` | `PAPER` | `PAPER` / `sim` (default) or `LIVE` |
| `ALLOW_LIVE` | unset | Must be `1` for LIVE intents; **default false** |
| `KILL_SWITCH` | unset | `1` → new actions marked `KILLED` |
| `SIGNAL_LARGE_VALUE_ETH` | `0.35` | LARGE_VALUE_BURST threshold |
| `ACTION_CHAIN_ID` | `1` | Default chain for unsigned intents |

No builder API keys. No private keys. Ever. LIVE still only builds `{ to, data, value, chainId }` for MetaMask — **never** broadcasts from server.

**Chains:** mainnet `1`, Arbitrum `42161`, Optimism `10`, Base `8453`. Paper mode works without RPC keys.

---

## API

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Status + `executionMode` / `allowLive` / `killSwitch` / chains |
| `GET /events?limit=50` | Recent `UnifiedBundleEvent[]` |
| `GET /anomalies` | PAPER burst heuristics |
| `GET /stats` | Kind/builder counts |
| `GET /signals?limit=50` | Action-layer signals |
| `GET /actions?limit=50` | Paper / live-intent actions |
| `GET /pnl/summary` | Cumulative paper PnL (PLACEHOLDER) |
| `POST /action/kill` | Runtime kill switch |
| `POST /action/unkill` | Clear runtime kill |
| `WS /stream` | Live `{type:'event'\|'signal'\|'action', ...}` |

---

## Action layer (summary)

1. **Rules** detect `LARGE_VALUE_BURST`, `CROSS_BUILDER_ECHO`, `ORACLE_WINDOW_PLACEHOLDER` on the sim/unified stream  
2. **PAPER** executor creates `PAPER_FILLED` / `PAPER_SKIPPED` with fake fill + placeholder PnL  
3. **LIVE** path requires `ALLOW_LIVE=1` + `EXECUTION_MODE=LIVE` + UI toggle → `LIVE_INTENT` unsigned tx for MetaMask only  
4. Dashboard: MetaMask connect, chain switch buttons, signals feed, actions log, cumulative PnL chart  

Identity = MetaMask / injected wallet. **No KYC / no accounts.**

---

## Packages

| Workspace | Role |
|-----------|------|
| `@clearbook/bundle-schema` | `UnifiedBundleEvent` |
| `@clearbook/bundle-aggregator` | Adapters + normalizer + action layer + server |
| `@clearbook/bundle-dashboard` | Vite + React live UI |

---

## Demo / proof artifacts

| Script | Artifacts |
|--------|-----------|
| `npm run demo` | `SAMPLE_EVENTS.json`, `DEMO_PROOF.md` |
| `npm run demo:action` | `DEMO_ACTION_PROOF.md` (+ sample `/signals` `/actions` `/pnl/summary`) |

---

## What this is / is not

| Is | Is not |
|----|--------|
| Architecture + action-layer E2E proof | Production MEV stack |
| PAPER simulated private OF | Live Titan/Beaver private OF |
| PAPER fills + optional MetaMask intents | Custodial searcher / key custody |
| Optional public RPC + public MEV-Share SSE listen | Authenticated bundle submission / server broadcast |

Commercial private OF (Titan, Beaver, etc.) requires separate contracts and keys — out of scope and intentionally not wired.

**Confirm: LIVE defaults false** (`EXECUTION_MODE=PAPER`, `ALLOW_LIVE` unset → `allowLive: false`, `canLive: false`).
