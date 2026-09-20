# Clearbook Bundle Radar — Access Plan

**POC date:** 2026-09-20  
**Constraint:** **No spend** for this POC. Prefer public endpoints, self-signed Flashbots auth, and free inference.  
**Ethos:** Observation + protection research (user-tx safety, sandwich exposure, refund transparency)—not productizing user-attack tooling.

Companion map: [`01-ENDPOINT-MAP.md`](./01-ENDPOINT-MAP.md).

---

## 0. Honesty gate

| Goal | Feasible without spend? | Notes |
| --- | --- | --- |
| Subscribe to **raw private bundles** across builders | **NO** | Protect/Relay/builders are submit-only to third parties |
| Subscribe to **MEV-Share hints** | **YES** | Public SSE; partial fields only |
| Submit **canary** private txs/bundles | **YES** | Flashbots / Titan / Beaver / BuilderNet |
| Stream bloXroute BackRunMe / BDN private OF | **NO (commercial)** | Requires paid `Authorization` header |
| Infer private OF after the fact | **PARTIAL** | Public mempool gaps + relay bidtraces + MEV-Share hints |

---

## 1. Keys & signup flows (no-spend path)

### 1.1 Flashbots Protect — wallets / canaries

| Step | Action | Cost |
| --- | --- | --- |
| 1 | Use `https://rpc.flashbots.net/fast` (add `hint` / `builder` / `refund` / `originId` query params as needed) | Free |
| 2 | Send canaries via `eth_sendRawTransaction` from a throwaway key | Gas only if landed |
| 3 | Optional: `originId=clearbook-bundle-radar-poc` | Free |
| Auth | None | — |

**No Flashbots account or API key required.**

### 1.2 Flashbots Relay + MEV-Share

| Step | Action | Cost |
| --- | --- | --- |
| 1 | Generate throwaway ETH keypair (auth signer) | Free |
| 2 | Header `X-Flashbots-Signature: <address>:<EIP-191 sig of keccak256(body)>` | Free |
| 3 | `GET https://mev-share.flashbots.net` (SSE) — **no auth** | Free |
| 4 | History: `GET /api/v1/history` + `/api/v1/history/info` | Free |
| 5 | Submit: `mev_sendBundle` / `eth_sendBundle` → `https://relay.flashbots.net` | Free (rate-limited) |
| 6 | Sim: `mev_simBundle` / `eth_callBundle` | Free (rate-limited) |

**Rate limits (binding):** Relay `eth_sendBundle`/`mev_sendBundle` **1800/IP/min**; sims **300**; cancels **600**; others **120**. Protect reads **200/IP/5min** for several eth_* methods; raw submit uncapped per docs. BuilderNet ~**100 HTTP/s**, 10 conn/s, 10 concurrent, 600 MB/min in.

### 1.3 BuilderNet

| Step | Action | Cost |
| --- | --- | --- |
| 1 | Same `X-Flashbots-Signature` as Relay | Free |
| 2 | POST `https://rpc.buildernet.org` (or `direct-us` / `direct-eu` / `direct-ap`) | Free |
| 3 | Optional aTLS: attested cert port **7936** + `https://measurements.buildernet.org` | Free |
| 4 | Optional listen: `wss://rpc.buildernet.org/ws/pamm_quote_stream` | Free |
| 5 | Priority-update key for `/ws/sendquoteupdate` | Request via Telegram `t.me/buildernet_general` — out-of-band for day-0 |

### 1.4 Titan / Beaverbuild / rsync

| Builder | Signup | Key | POC action |
| --- | --- | --- | --- |
| **Titan** | None | None in public docs | Canary to `https://rpc.titanbuilder.xyz` (+ regional) |
| **Beaverbuild** | None | Ignores auth headers | Canary to `https://rpc.beaverbuild.org/` |
| **rsync** | None (docs) | None documented | **DNS: no A record (2026-09-20)** — re-resolve `rsync-builder.xyz` before wiring; else skip |

### 1.5 builder0x69

**Skip** — DNS SERVFAIL / unreachable (2026-09-20).

### 1.6 bloXroute (commercial — plan only, no purchase)

| Step | Action | Cost |
| --- | --- | --- |
| 1 | Portal account → Authorization header | Signup free **UNKNOWN**; streams paid |
| 2 | `https://api.blxrbdn.com` + `Authorization` | Plan |
| 3 | Submit: `blxr_private_tx` / `bsc_private_tx` | Plan |
| 4 | Stream: `wss://backrunme.blxrbdn.com/ws` → subscribe **`arbOnlyMEV`** | Plan |
| 5 | BDN `newTxs` / `pendingTxs` regional WSS | Plan (historically ~$300/mo/stream—verify) |
| 6 | Gateway appliance | Higher plan (historically ~$1.5k/mo—verify) |

**POC decision:** Adapter behind `BLOXROUTE_AUTH` env flag; **disabled** until budget + policy review.

### 1.7 Eden Network

**Skip** — shutdown Aug 2025.

### 1.8 PBS relays (Data API)

| Step | Action | Cost |
| --- | --- | --- |
| 1 | No searcher key | Free |
| 2 | Poll `GET /relay/v1/data/bidtraces/proposer_payload_delivered?limit=N` | Free |
| 3 | Optionally `builder_blocks_received` | Free |
| 4 | Join as builder/proposer | **Out of POC scope** |

**Verified Data API hosts (2026-09-20):** `boost-relay.flashbots.net`, `relay.ultrasound.money`, `aestus.live`, `titanrelay.xyz`. Agnostic site: `agnostic-relay.net`.

---

## 2. Partnership / commercial asks (deferred)

Frame as **protection / transparency research**.

| Party | Ask | Channel | Explicitly not asking for |
| --- | --- | --- | --- |
| Flashbots / BuilderNet | Higher rate limits; canary `originId` refund analytics; hint-stable configs | Discord/forum; `t.me/buildernet_general`; Protect integration contact | Feed of other users' private txs |
| Titan / Beaver / rsync | No-redistribution confirmation; status for our `replacementUuid`; rate-limit guidance | Docs contact / public socials | Mempool dump APIs |
| bloXroute | Research trial for BackRunMe + ETH `newTxs` (if offered) | Portal sales/support | Unrestricted resale of OF |
| Relay ops (Ultrasound, Agnostic, Aestus, Titan Relay) | Data API SLO; historical bidtrace bulk if any | Operator contacts | Pre-reveal execution payloads |

---

## 3. Fallback inference stack (primary POC architecture)

Private OF is unreadable by default → **infer**, do not pretend to subscribe.

```
                    ┌─────────────────────────────┐
                    │  MEV-Share SSE (hints)       │  pre-inclusion, partial
                    └─────────────┬───────────────┘
                                  │
┌──────────────┐   gap      ┌─────▼──────┐   posthoc   ┌─────────────────────┐
│ Public       │───────────►│ Correlation│◄────────────│ Relay Data API      │
│ mempool      │  analysis  │  engine    │             │ bidtraces           │
│ (node/WSS)   │            └─────┬──────┘             └─────────────────────┘
└──────────────┘                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │ On-chain receipts / traces  │
                    │ builder pubkey ↔ dark txs   │
                    │ coinbase payments / tips    │
                    └─────────────────────────────┘
```

### 3.1 Public mempool

- Local/rented node: `txpool_content` / pending subscription  
- Public WSS providers (expect filtering/incompleteness)

### 3.2 MEV-Share hints (best free pre-inclusion signal)

Persist SSE events (timestamp + tip block). On each new block, match inclusions to prior hints. Unmatched inclusions never seen in public pending ≈ **likely-private OF**.

### 3.3 Mempool gap (“dark tx”) detector

Per block: block hashes − previously seen pending hashes (TTL) → private-path candidates. Attribute builder via fee recipient / `extraData` heuristics + relay `proposer_payload_delivered` (`builder_pubkey`, `block_hash`, `value`, `num_tx`).

**Limits:** Cannot recover unsigned private contents; cannot see losing bundles; false positives from sync gaps.

### 3.4 Relay bidtrace inference

High delivered `value` + high private-gap rate → statistical private-OF concentration by builder—not content-level visibility.

### 3.5 Canary differential probes (self-owned keys only)

| Probe | Learns |
| --- | --- |
| Protect vs public | Inclusion path, refund, hint emission |
| Hint matrix (`hint=` params) | Leakage under each Protect config |
| Builder multiplex | Relative accept/latency (Titan/Beaver/Relay/BuilderNet) |
| Replace/cancel UUIDs | Builder cancel semantics |

**Hard rule:** Never target third-party user txs for extraction.

### 3.6 On-chain MEV residue

Coinbase payments / tip distributions; sandwich patterns around unmarked gaps (**protection scoring**); Protect/BuilderNet refund txs matched to canary auth address.

---

## 4. POC build order (no spend)

| Day | Deliverable |
| --- | --- |
| **D0** | MEV-Share SSE consumer + store |
| **D0** | Relay Data API poller (Flashbots + Ultrasound + Aestus + Titan) |
| **D1** | Public mempool listener + block gap classifier |
| **D1** | Canary sender (Protect + signed Relay + Beaver + Titan) |
| **D2** | Join layer: hint ↔ block ↔ `builder_pubkey` dashboard |
| **D3** | Optional BuilderNet canary + `pamm_quote_stream` observer |
| **Later** | bloXroute adapter behind feature flag (**budget + policy**) |

### Non-goals

- Purchasing bloXroute / exclusive OF  
- Claiming “we see all private bundles”  
- Shipping attack runbooks against user Protect txs  

---

## 5. Credential inventory

| Credential | Create now? | Store as | Spend? |
| --- | --- | --- | --- |
| Flashbots auth key | **Yes** | `FLASHBOTS_AUTH_KEY` | No |
| Canary funding key | **Yes** (tiny ETH) | Separate from auth | Gas only |
| BuilderNet priority API key | Optional ask | `BUILDERNET_PRIORITY_KEY` | No if granted |
| bloXroute Authorization | **No** (defer) | `BLOXROUTE_AUTH` | Yes later |
| Relay proposer/builder keys | **No** | — | Ops burden |

---

## 6. Risk & compliance

- Respect rate limits; backoff; single POC IP identity.  
- Do not republish full MEV-Share calldata that could deanonymize users—aggregate/redact in Clearbook UX.  
- Modest relay polling (e.g. ≤1 poll/slot/relay) with caching.  
- Marketing: **“private-OF inference & protection analytics”** — never **“see everyone’s bundles.”**

---

## 7. Quick reference — wire first

```text
MUST (free):
  GET  https://mev-share.flashbots.net
  GET  https://boost-relay.flashbots.net/relay/v1/data/bidtraces/proposer_payload_delivered
  GET  https://relay.ultrasound.money/relay/v1/data/bidtraces/proposer_payload_delivered
  POST https://rpc.flashbots.net/fast           (canary)
  POST https://relay.flashbots.net              (signed canary)
  POST https://rpc.beaverbuild.org/             (canary)
  POST https://rpc.titanbuilder.xyz             (canary)

SHOULD (free):
  POST https://rpc.buildernet.org               (signed canary)
  GET  Aestus + Titanrelay bidtraces
  WSS  wss://rpc.buildernet.org/ws/pamm_quote_stream

DEFER (paid / partnership):
  WSS  wss://backrunme.blxrbdn.com/ws           (arbOnlyMEV)
  BDN  newTxs / Gateway

SKIP:
  Eden, builder0x69 (dead/unresolved), rsync until DNS A-record returns
```

---

## Provenance

- Flashbots Protect / Relay / MEV-Share / rate-limit docs (2026-09-20)  
- BuilderNet send-orderflow + API; WS paths `/ws/sendquoteupdate`, `/ws/pamm_quote_stream`  
- Beaverbuild / Titan docs; bloXroute `arbOnlyMEV` docs  
- Live probes: Protect, Relay, Beaver, Titan, BuilderNet, bloXroute auth gate, relay Data APIs  
- DNS: `rsync-builder.xyz` no A record; `builder0x69.io` SERVFAIL  
