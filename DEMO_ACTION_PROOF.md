# Bundle Radar DEMO_ACTION_PROOF

**Generated:** 2026-09-20 12:27:41 CDT (box-local / America/Chicago)
**Mode:** PAPER (default) — LIVE requires ALLOW_LIVE=1 + EXECUTION_MODE=LIVE + UI toggle
**Aggregator PID:** 70062 · port 8787

## Safety confirmations

- `EXECUTION_MODE` default **PAPER**
- `ALLOW_LIVE` unset → `allowLive: false`, `canLive: false`
- Server `holdsPrivateKeys: false`, does not broadcast
- paperEv / PnL = **PLACEHOLDER** — not promised alpha
- Sim OF ≠ real private OF; do not sandwich Clearbook users

## GET /health

```json
{
  "ok": true,
  "mode": "PAPER",
  "executionMode": "PAPER",
  "allowLive": false,
  "canLive": false,
  "killSwitch": false,
  "holdsPrivateKeys": false,
  "broadcastsFromServer": false,
  "chains": [
    {
      "id": 1,
      "name": "Ethereum Mainnet",
      "hex": "0x1"
    },
    {
      "id": 42161,
      "name": "Arbitrum One",
      "hex": "0xa4b1"
    },
    {
      "id": 10,
      "name": "Optimism",
      "hex": "0xa"
    },
    {
      "id": 8453,
      "name": "Base",
      "hex": "0x2105"
    }
  ],
  "banner": "PAPER POC — simulated private OF; not production; no live searcher; action layer PAPER-default",
  "uptimeSec": 0,
  "actionLayer": true,
  "cumulativePnlEth": 0,
  "totalBuffered": 1,
  "byKind": {
    "hint": 1
  },
  "byBuilder": {
    "flashbots": 1
  },
  "eventsLast60s": 1
}
```

## GET /signals?limit=5

```json
{
  "mode": "PAPER",
  "allowLive": false,
  "disclaimer": "paperEvEth is PLACEHOLDER — not promised alpha. Sim OF ≠ real private OF.",
  "signals": [
    {
      "id": "sig_mua3a9bs_0695d995",
      "type": "ORACLE_WINDOW_PLACEHOLDER",
      "at": "2026-09-20T17:27:39.448Z",
      "eventIds": [
        "sim_mua3a9bs_39aef07e"
      ],
      "paperEvEth": 0.00571,
      "rationale": "Label/raw matched oracle/resolution keywords (PLACEHOLDER window tag — not real oracle arb)"
    },
    {
      "id": "sig_mua3a8hf_6bca0ec9",
      "type": "LARGE_VALUE_BURST",
      "at": "2026-09-20T17:27:38.355Z",
      "eventIds": [
        "sim_mua3a8hf_6589e850"
      ],
      "paperEvEth": 0.014123,
      "rationale": "valueEth=0.505245 ≥ threshold 0.35 (PAPER heuristic; paperEv PLACEHOLDER)"
    },
    {
      "id": "sig_mua3a7le_b955303f",
      "type": "LARGE_VALUE_BURST",
      "at": "2026-09-20T17:27:37.202Z",
      "eventIds": [
        "sim_mua3a7le_5dd6b3b1"
      ],
      "paperEvEth": 0.01288,
      "rationale": "valueEth=0.491044 ≥ threshold 0.35 (PAPER heuristic; paperEv PLACEHOLDER)"
    },
    {
      "id": "sig_mua3a47k_a86e0a08",
      "type": "ORACLE_WINDOW_PLACEHOLDER",
      "at": "2026-09-20T17:27:32.816Z",
      "eventIds": [
        "sim_mua3a47k_ba5b825a"
      ],
      "paperEvEth": 0.004947,
      "rationale": "Label/raw matched oracle/resolution keywords (PLACEHOLDER window tag — not real oracle arb)"
    },
    {
      "id": "sig_mua3a1x4_6e7e10d2",
      "type": "ORACLE_WINDOW_PLACEHOLDER",
      "at": "2026-09-20T17:27:29.848Z",
      "eventIds": [
        "sim_mua3a1x3_709c1447"
      ],
      "paperEvEth": 0.005857,
      "rationale": "Label/raw matched oracle/resolution keywords (PLACEHOLDER window tag — not real oracle arb)"
    }
  ]
}
```

## GET /actions?limit=5

```json
{
  "mode": "PAPER",
  "allowLive": false,
  "disclaimer": "PAPER fills are simulated. LIVE intents are unsigned for MetaMask only — server never broadcasts.",
  "actions": [
    {
      "id": "act_mua3a9bs_f23b006f",
      "signalId": "sig_mua3a9bs_0695d995",
      "signalType": "ORACLE_WINDOW_PLACEHOLDER",
      "at": "2026-09-20T17:27:39.448Z",
      "status": "PAPER_SKIPPED",
      "latencyMs": 22,
      "rationale": "PAPER skip — risk gate / low confidence on ORACLE_WINDOW_PLACEHOLDER (paperEv 0.00571 PLACEHOLDER)"
    },
    {
      "id": "act_mua3a8hf_e6174f65",
      "signalId": "sig_mua3a8hf_6bca0ec9",
      "signalType": "LARGE_VALUE_BURST",
      "at": "2026-09-20T17:27:38.355Z",
      "status": "PAPER_SKIPPED",
      "latencyMs": 29,
      "rationale": "PAPER skip — risk gate / low confidence on LARGE_VALUE_BURST (paperEv 0.014123 PLACEHOLDER)"
    },
    {
      "id": "act_mua3a7le_e1704591",
      "signalId": "sig_mua3a7le_b955303f",
      "signalType": "LARGE_VALUE_BURST",
      "at": "2026-09-20T17:27:37.202Z",
      "status": "PAPER_FILLED",
      "fillPriceEth": 0.01468,
      "pnlEth": 0.010408,
      "latencyMs": 62,
      "rationale": "PAPER fill on LARGE_VALUE_BURST — fake fill @ 0.01468 ETH; pnlEth=0.010408 (PLACEHOLDER, not real alpha)"
    },
    {
      "id": "act_mua3a47k_a9c1c29a",
      "signalId": "sig_mua3a47k_a86e0a08",
      "signalType": "ORACLE_WINDOW_PLACEHOLDER",
      "at": "2026-09-20T17:27:32.816Z",
      "status": "PAPER_FILLED",
      "fillPriceEth": 0.006883,
      "pnlEth": 0.003484,
      "latencyMs": 43,
      "rationale": "PAPER fill on ORACLE_WINDOW_PLACEHOLDER — fake fill @ 0.006883 ETH; pnlEth=0.003484 (PLACEHOLDER, not real alpha)"
    },
    {
      "id": "act_mua3a1x4_d36e8f60",
      "signalId": "sig_mua3a1x4_6e7e10d2",
      "signalType": "ORACLE_WINDOW_PLACEHOLDER",
      "at": "2026-09-20T17:27:29.848Z",
      "status": "PAPER_SKIPPED",
      "latencyMs": 53,
      "rationale": "PAPER skip — risk gate / low confidence on ORACLE_WINDOW_PLACEHOLDER (paperEv 0.005857 PLACEHOLDER)"
    }
  ]
}
```

## GET /pnl/summary

```json
{
  "mode": "PAPER",
  "allowLive": false,
  "killSwitch": false,
  "cumulativePnlEth": 0.013892,
  "filledCount": 2,
  "skippedCount": 3,
  "liveIntentCount": 0,
  "blockedCount": 0,
  "killedCount": 0,
  "signalCount": 5,
  "actionCount": 5,
  "disclaimer": "Paper PnL is PLACEHOLDER — not promised alpha. Sim OF ≠ real private OF.",
  "series": [
    {
      "at": "2026-09-20T17:27:32.816Z",
      "cumulativePnlEth": 0.003484
    },
    {
      "at": "2026-09-20T17:27:37.202Z",
      "cumulativePnlEth": 0.013892
    }
  ]
}
```

## Aggregator log (tail)

```
=== Clearbook Bundle Radar Aggregator ===
PAPER POC — simulated private OF; not production; no live searcher
Never stores private keys. No paid builder keys required.
This does NOT grant Titan/Beaver private OF — commercial access required for real private streams.
Action layer: do not sandwich Clearbook users; paper EV is PLACEHOLDER; sim OF ≠ real private OF.
[boot] EXECUTION_MODE=PAPER ALLOW_LIVE→allowLive=false canLive=false kill=false
[normalizer] starting 3 adapters (PAPER-first)
[simAdapter] starting PAPER simulated private-bundle feed (1–2s) + action-layer hooks
[publicMempoolAdapter] ETH_RPC_URL unset — no-op (skipping public RPC)
[mevShareStubAdapter] stub mode — SKIP_MEV_SHARE=1 or tryLive=false; emitting kind=hint placeholders every 5000ms
[action] engine started · mode=PAPER · canLive=false · kill=false
[server] HTTP+WS listening on :8787
[server] PAPER POC — simulated private OF; not production; no live searcher; action layer PAPER-default
[server] executionMode=PAPER allowLive=false canLive=false
[server] GET /health /events /signals /actions /pnl/summary  WS /stream
```
