# Clearbook Bundle Radar — Action Layer (EOD POC)

**Date:** 2026-09-20 (CT)  
**Status:** PAPER-default · LIVE gated · MetaMask-only signing  
**Path:** `clearbook/mev/bundle-radar/`

---

## 0. Intent

Extend Bundle Radar from **observe** → **propose action** without becoming a custodial searcher:

1. Detect PAPER patterns on the unified event stream  
2. Emit `Signal` objects with placeholder EV (`paperEvEth`)  
3. In **PAPER** mode: simulate fills (`PAPER_FILLED` / `PAPER_SKIPPED`) and track fake PnL  
4. In **LIVE** mode (triple-gated): build **unsigned** tx intents for MetaMask — **never** hold keys or broadcast from the server  

> **Honesty:** Paper EV is a **PLACEHOLDER**, not promised alpha. Simulated OF ≠ real private OF. Do **not** sandwich Clearbook users.

---

## 1. Signal → action rules

| Signal type | Trigger (PAPER heuristics) | Typical action |
|-------------|----------------------------|----------------|
| `LARGE_VALUE_BURST` | `valueEth` ≥ threshold (default `0.35`) | Paper fill or skip by random gate |
| `CROSS_BUILDER_ECHO` | Same tx-hash hint seen across ≥2 builders within window | Paper echo-aware skip/fill |
| `ORACLE_WINDOW_PLACEHOLDER` | Event `label` contains oracle/resolution keywords | Tag-only / low-size paper action |

Each `Signal`:

```ts
{
  id: string;
  type: "LARGE_VALUE_BURST" | "CROSS_BUILDER_ECHO" | "ORACLE_WINDOW_PLACEHOLDER";
  at: string;           // ISO
  eventIds: string[];
  paperEvEth: number;   // PLACEHOLDER — not real EV
  rationale: string;
}
```

Each `Action`:

```ts
{
  id: string;
  signalId: string;
  at: string;
  status: "PAPER_FILLED" | "PAPER_SKIPPED" | "LIVE_INTENT" | "LIVE_BLOCKED" | "KILLED";
  fillPriceEth?: number;
  pnlEth?: number;
  latencyMs: number;
  rationale: string;
  unsignedTx?: { to: string; data: string; value: string; chainId: number };
}
```

---

## 2. PAPER vs LIVE state machine

```
                    ┌──────────────────┐
                    │ EXECUTION_MODE   │
                    │ default = PAPER  │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼                             ▼
        ┌──────────┐                  ┌──────────┐
        │  PAPER   │                  │   LIVE   │
        └────┬─────┘                  └────┬─────┘
             │                             │
             │  signal → paperExecutor     │  canLive()?
             │  PAPER_FILLED|SKIPPED       │
             │                             ▼
             │                    ALLOW_LIVE=1 ?
             │                    UI toggle on ?
             │                    kill switch off ?
             │                             │
             │              ┌──────────────┴──────────────┐
             │              ▼                             ▼
             │         LIVE_INTENT                  LIVE_BLOCKED
             │      (unsigned tx for                    │
             │       MetaMask only)                     │
             ▼                             ▼
        PnL ring buffer              never broadcast
```

### Gates for LIVE

| Gate | Requirement |
|------|-------------|
| Env | `ALLOW_LIVE=1` **and** `EXECUTION_MODE=LIVE` (or `live`) |
| UI | Explicit LIVE toggle (disabled unless `/health.allowLive === true`) |
| Signing | MetaMask / injected wallet only — server builds intent, wallet signs |
| Broadcast | **Never** from server |
| Kill | `KILL_SWITCH=1` or UI kill → all new actions `KILLED` |

Default: `EXECUTION_MODE=PAPER` (aliases: `sim`, `paper`). **LIVE defaults false.**

---

## 3. Chain support

Configured chain IDs (Ethereum-family):

| Network | chainId |
|---------|---------|
| Ethereum mainnet | `1` |
| Arbitrum One | `42161` |
| Optimism | `10` |
| Base | `8453` |

Paper mode works **without** RPC keys. LIVE intents include `chainId` for `wallet_switchEthereumChain` / `eth_sendTransaction` in the browser.

---

## 4. Kill switches

1. **Env `KILL_SWITCH=1`** — engine marks new actions `KILLED`; no LIVE intents  
2. **UI Kill** — client POST `/action/kill` (or local UI flag) stops proposing  
3. **Missing MetaMask** — LIVE path returns `LIVE_BLOCKED` with rationale  
4. **`ALLOW_LIVE` unset** — `canLive()` always false  

---

## 5. MetaMask flow

1. User clicks **Connect wallet** → `eth_requestAccounts`  
2. Dashboard shows address + current `chainId`  
3. Switch buttons request `wallet_switchEthereumChain` for `1 / 42161 / 10 / 8453`  
4. If LIVE gated open and a signal produces `LIVE_INTENT`, dashboard offers **Sign in MetaMask** with the unsigned `{ to, data, value, chainId }` — user alone decides  
5. Server never receives a private key and never calls `eth_sendRawTransaction`

**Identity = wallet address.** No KYC, no accounts.

---

## 6. Ethos reminders

- Do **not** sandwich Clearbook users  
- `paperEvEth` / paper PnL = **PLACEHOLDER**, not promised alpha  
- Sim OF ≠ real private OF (Titan/Beaver/etc. need commercial access)  
- $0 POC — aggregator stays on **8787**; no paid infra required  

---

## 7. API additions

| Endpoint | Description |
|----------|-------------|
| `GET /signals?limit=50` | Recent signals ring buffer |
| `GET /actions?limit=50` | Recent actions |
| `GET /pnl/summary` | Cumulative paper PnL + counts |
| `GET /health` | Includes `executionMode`, `allowLive`, `killSwitch`, `chains` |
| `WS /stream` | Also pushes `{ type: "signal" \| "action", ... }` |

---

## 8. Files

```
apps/aggregator/src/action/
  types.ts
  chains.ts
  rules.ts
  paperExecutor.ts
  liveGate.ts
  store.ts
  engine.ts
```
