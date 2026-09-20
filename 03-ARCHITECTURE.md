# Clearbook Bundle Radar — Architecture (EOD POC)

**Date:** 2026-09-20 (CT)  
**Status:** PAPER POC · $0 · prove architecture E2E  
**Path:** `clearbook/mev/bundle-radar/`

---

## 0. Intent

Prove a **defense-first / observation** pipeline that:

1. Ingests multiple **orderflow-shaped** feeds via pluggable adapters  
2. Normalizes them into one **UnifiedBundleEvent** schema  
3. Serves a merged stream over **HTTP + WebSocket**  
4. Renders a live **dashboard** (table, charts, anomalies, PAPER score panel)

This does **not** grant Titan / Beaver private OF. Commercial access is required for real private streams. No private keys are stored. Simulated data is labeled `kind=simulated`.

---

## 1. High-level diagram

```
 ┌─────────────────┐   ┌──────────────────────┐   ┌─────────────────────┐
 │  simAdapter     │   │ publicMempoolAdapter │   │ mevShareStubAdapter │
 │  kind=simulated │   │ kind=public_mempool  │   │ kind=hint (+ live)  │
 │  1–2s fake OF   │   │ ETH_RPC_URL optional │   │ SSE or placeholders │
 └────────┬────────┘   └──────────┬───────────┘   └──────────┬──────────┘
          │                       │                          │
          └───────────────────────┼──────────────────────────┘
                                  ▼
                    ┌─────────────────────────┐
                    │   BundleNormalizer      │
                    │   ring buffer + fan-out │
                    │   anomaly heuristics    │
                    └────────────┬────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │  HTTP :8787 + WS /stream│
                    │  /health /events /stats │
                    └────────────┬────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │  Dashboard (Vite+React) │
                    │  table · charts · PAPER │
                    └─────────────────────────┘
```

---

## 2. Unified schema

Package: `@clearbook/bundle-schema` → `packages/schema/src/index.ts`

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Stable unique id |
| `source` | enum | Adapter name |
| `builder` | string | flashbots / titan / beaver / rsync / public / … |
| `txHashes` | string[] | Related tx hashes |
| `valueEth?` | number | Optional PAPER value |
| `gas?` | number | Optional gas sample |
| `receivedAt` | string | ISO-8601 |
| `kind` | enum | `hint` \| `simulated` \| `public_mempool` \| `relay_stats` |
| `raw?` | unknown | Debug payload (never secrets) |
| `paperScore?` | number | **NOT real EV** — placeholder ranking |
| `label?` | string | Human provenance / unavailability note |

Dashboard badges: **SIM** / **PUBLIC** / **HINT** / **STATS**.

---

## 3. Aggregator (`apps/aggregator`)

### 3.1 Normalizer

- Accepts `EmitFn` from each adapter  
- Validates with `isUnifiedBundleEvent`  
- Keeps a ring buffer (default 500)  
- Fans out to WebSocket subscribers  
- Exposes `getRecent`, `getStats`, `getAnomalies` (burst rate / builder spike)

### 3.2 Adapters

| Adapter | Behavior |
|---------|----------|
| **simAdapter** | Emits realistic fake private-bundle-like events every 1–2s for builders `flashbots`, `titan`, `beaver`, `rsync`. Always `kind=simulated` + PAPER label. |
| **publicMempoolAdapter** | If `ETH_RPC_URL` set, polls `eth_blockNumber` over HTTPS. If unset → **no-op with log**. No paid keys. |
| **mevShareStubAdapter** | Tries public Flashbots MEV-Share SSE (`https://mev-share.flashbots.net`, listen-only, no key). On failure → stub emits periodic `kind=hint` placeholders labeled unavailable. Set `SKIP_MEV_SHARE=1` to force stub. |

### 3.3 HTTP + WebSocket (port **8787**)

| Route | Purpose |
|-------|---------|
| `GET /health` | Liveness + buffer stats |
| `GET /events?limit=50` | Recent merged events JSON |
| `GET /anomalies` | PAPER burst heuristics |
| `GET /stats` | Counts by kind/builder |
| `WS /stream` | Push `{ type: "event", event }` JSON |

---

## 4. Dashboard (`apps/dashboard`)

Vite + React + Recharts:

1. **Banner** — `PAPER POC — simulated private OF; not production; no live searcher`  
2. **Live table** — source, builder, #txs, time, kind badge  
3. **Charts** — events/min by builder; kind mix pie  
4. **Anomaly list** — burst / builder spike  
5. **Ranked PAPER score panel** — gas×random tip; clearly **not** real EV  

Dev proxy: `/api/*` → `http://127.0.0.1:8787`, `/stream` → WS aggregator.

---

## 5. Constraints & ethos

- **$0** — no paid builder keys required to run the POC  
- **PAPER-first** — simulated data labeled; placeholders when live feeds blocked  
- **Never store private keys**  
- Listening to public MEV-Share hints ≠ private builder OF  
- Real Titan / Beaver private streams require **commercial access**  
- No live searcher / no mainnet execution in this POC  

---

## 6. Monorepo layout

```
bundle-radar/
  03-ARCHITECTURE.md
  README.md
  demo.sh
  DEMO_PROOF.md
  SAMPLE_EVENTS.json
  package.json            # npm workspaces
  packages/schema/        # UnifiedBundleEvent
  apps/aggregator/        # Node TS · adapters · :8787
  apps/dashboard/         # Vite+React
```
