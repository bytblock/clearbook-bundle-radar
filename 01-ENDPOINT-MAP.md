# Clearbook Bundle Radar — Endpoint Map

**POC date:** 2026-09-20  
**Scope:** Private mempool / builder RPC / PBS relay surfaces for observing or inferring private orderflow (OF) on Ethereum (and BSC where noted).  
**Ethos:** Clearbook uses this for **observation and protection research** (user-tx safety, sandwich risk measurement, refund transparency)—not for marketing user-attack tooling.

## Legend — third-party visibility

| Tag | Meaning |
| --- | --- |
| **SUBMIT-ONLY** | Accepts txs/bundles; does **not** expose other parties' private OF |
| **HINT-STREAM** | Public or lightly-gated stream of *partial* hints (not raw private txs) |
| **PRIVILEGED-STREAM** | Private/redacted OF stream requires commercial enrollment |
| **POST-HOC** | Public after inclusion (blocks, relay bid traces)—not pre-inclusion OF |
| **N/A / DEAD** | Shutdown, unresolved DNS, or not a searcher OF surface |

**POC suitability for “subscribe to private bundles”:** almost always **NO** for raw private OF. Exceptions called out explicitly.

---

## 1. Flashbots Protect (retail RPC)

| Field | Value |
| --- | --- |
| **URLs** | Mainnet: `https://rpc.flashbots.net`, `https://rpc.flashbots.net/fast`; Sepolia: `https://rpc-sepolia.flashbots.net/`; Tor onion in Protect quick-start |
| **Auth** | None for wallet-style `eth_sendRawTransaction`. Optional query params: `hint`, `builder`, `refund`, `originId`, `canRevert`, `blockRange`, `auctionTimeout`, custom read `url` |
| **Third-party observer** | **SUBMIT-ONLY.** Send *your* txs only. No list/poll/subscribe of others' Protect txs. |
| **Registered searcher** | Same. Protect is not a searcher ingress; OF may forward to MEV-Share/builders per user settings. |
| **Rate limits** | Docs: `eth_sendRawTransaction` **None**; `eth_call` / `eth_getTransactionReceipt` / `eth_getTransactionByBlockNumberAndIndex` / `eth_getBalance` **200 / IP / 5 min**; all other methods **600 / IP / 5 min**. Batch JSON-RPC **unsupported**. |
| **Access** | **Public** |
| **Docs** | https://docs.flashbots.net/flashbots-protect/quick-start · https://docs.flashbots.net/flashbots-protect/settings-guide · https://docs.flashbots.net/flashbots-protect/ratelimiting |
| **Subscribe private bundles?** | **NO** |

---

## 2. Flashbots Bundle Relay (`relay.flashbots.net`)

| Field | Value |
| --- | --- |
| **URLs** | Mainnet: `https://relay.flashbots.net`; Sepolia: `https://relay-sepolia.flashbots.net` |
| **Auth** | Required: `X-Flashbots-Signature: <address>:<EIP-191 sig of keccak256(body)>` (any ETH key; reputation/refunds) |
| **Third-party observer** | **SUBMIT-ONLY** (+ simulate *your* bundles). Methods include `eth_sendBundle`, `mev_sendBundle`, `eth_callBundle`, `mev_simBundle`, `eth_cancelBundle`, `eth_sendPrivateTransaction`, `eth_cancelPrivateTransaction`, fee-refund getters. No pending private-pool dump. |
| **Registered searcher** | Same surface—submit/simulate own OF only. |
| **Rate limits** | Per IP / 1 min: `eth_sendBundle` **1800**; `mev_sendBundle` **1800**; cancel **600**; `mev_simBundle` / `eth_callBundle` **300**; others **120**. Bundle caps: ≤100 txs, ≤300 KB. RPC page also cites 10 000 req/s/IP ceiling (method table is the practical limit). |
| **Access** | **Public** with self-signed header (no commercial key) |
| **Docs** | https://docs.flashbots.net/flashbots-auction/advanced/rpc-endpoint · https://docs.flashbots.net/flashbots-mev-share/searchers/ratelimiting |
| **Subscribe private bundles?** | **NO** |

---

## 3. Flashbots MEV-Share (hint event stream)

| Field | Value |
| --- | --- |
| **URLs** | SSE: `https://mev-share.flashbots.net` (mainnet), `https://mev-share-sepolia.flashbots.net` (Sepolia). History: `GET /api/v1/history`, `/api/v1/history/info`. Bundle submit via `https://relay.flashbots.net` (`mev_sendBundle`). |
| **Auth** | **SSE listen: none.** Bundle submit/sim: `X-Flashbots-Signature`. |
| **Third-party observer** | **HINT-STREAM (partial).** User-selected hints only (e.g. hash/double-hash, `to`, selector, calldata, logs, gas). Absent fields = opted out. **Not** raw signed private txs / full private bundles. |
| **Registered searcher** | Same public hint stream + backrun via `mev_sendBundle` referencing hint hash. Docs note (as of 2025-10-20): backrun body limited to **one** backrun tx. |
| **Rate limits** | Live SSE: no classic RPS table; history `maxLimit` via `/api/v1/history/info` (historically 500/page on testnet examples). Submit limits = relay table. |
| **Access** | **Public** hint stream; **public** signed submit |
| **Docs** | https://docs.flashbots.net/flashbots-mev-share/searchers/event-stream · https://docs.flashbots.net/flashbots-mev-share/searchers/getting-started |
| **Subscribe private bundles?** | **PARTIAL — YES for hints; NO for raw private OF** |

**POC note:** Strongest *no-spend* pre-inclusion signal for Bundle Radar.

---

## 4. Flashbots BuilderNet

| Field | Value |
| --- | --- |
| **URLs** | Global: `https://rpc.buildernet.org`; regional: `https://direct-us.buildernet.org`, `https://direct-eu.buildernet.org`, `https://direct-ap.buildernet.org`. TEE attestation port **7936**. Priority-update WS: `/ws/sendquoteupdate`; public propAMM stream: `/ws/pamm_quote_stream`. Refunds via Flashbots relay / `buildernet_*` APIs. |
| **Auth** | `X-Flashbots-Signature` on `eth_sendBundle` / `eth_sendRawTransaction`. Priority updates: `Authorization` API key (on request). propAMM stream: **no API key**. Optional aTLS via `attested-get` + `https://measurements.buildernet.org`. |
| **Third-party observer** | **SUBMIT-ONLY** for OF RPC. **Limited public stream:** `/ws/pamm_quote_stream` = opt-in priority-update *state overrides*—not arbitrary private user bundles. |
| **Registered participant** | Submit bundles/raw txs; TEE verify; refund APIs; priority-update keys for propAMM operators. |
| **Rate limits** | 10 new TCP/s; 10 concurrent TCP; 600 MB/min in; ~100 HTTP/s (1000/10s). Higher via Telegram `t.me/buildernet_general`. |
| **Access** | **Public** signed submit; **registration** for priority-update keys |
| **Docs** | https://buildernet.org/docs/send-orderflow · https://buildernet.org/docs/api |
| **Subscribe private bundles?** | **NO** (narrow propAMM stream ≠ private bundles) |

---

## 5. Titan Builder

| Field | Value |
| --- | --- |
| **URLs** | Geo: `https://rpc.titanbuilder.xyz`; regional: `eu.rpc.titanbuilder.xyz`, `us.rpc.titanbuilder.xyz`, `ap.rpc.titanbuilder.xyz`; Hoodi testnet: `https://rpc-hoodi.titanbuilder.xyz/`. Validator relay: `titanrelay.xyz` (§11). |
| **Auth** | Public docs show **no** `X-Flashbots-Signature` for JSON-RPC examples—**open submit**. |
| **Third-party observer** | **SUBMIT-ONLY.** Docs: never unbundles; never broadcasts private txs/bundles to public mempool. No public pending-OF stream. |
| **Registered searcher** | Same open RPC (`eth_sendBundle`, `eth_sendPrivateTransaction`, etc.). |
| **Rate limits** | **UNKNOWN** (unpublished). |
| **Access** | **Public** submit |
| **Docs** | https://docs.titanbuilder.xyz/ · https://docs.titanbuilder.xyz/api/eth_sendbundle |
| **Subscribe private bundles?** | **NO** |
| **Coinbase** | `titanbuilder.eth` → `0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97` |

---

## 6. Beaverbuild

| Field | Value |
| --- | --- |
| **URLs** | `https://rpc.beaverbuild.org/` |
| **Auth** | Docs: *"Beaver doesn't care about your authentication headers and signatures."* Open submit. |
| **Third-party observer** | **SUBMIT-ONLY.** `eth_sendRawTransaction` / `eth_sendPrivateRawTransaction`, `eth_sendBundle` (uuid cancel/replace, refunds, BuilderNet forward flags). No listen API. |
| **Rate limits** | **UNKNOWN**. |
| **Access** | **Public** |
| **Docs** | https://beaverbuild.org/docs.html |
| **Subscribe private bundles?** | **NO** |

---

## 7. rsync-builder

| Field | Value |
| --- | --- |
| **URLs** | Documented: `https://rsync-builder.xyz` (docs `/docs`) |
| **Auth** | No Flashbots-style signature in public docs—treat as **open submit** (UNKNOWN if soft IP limits). |
| **Third-party observer** | **SUBMIT-ONLY.** `eth_sendBundle`, `eth_cancelBundle`, `eth_sendPrivateRawTransaction`. Fee recipient on site: `0x1f9090aae28b8a3dceadf281b0f12828e676c326`. |
| **Rate limits** | **UNKNOWN**. |
| **Access** | **Public when DNS resolves.** **Research note (2026-09-20):** Cloudflare DoH returned SOA but **no A record** for `rsync-builder.xyz`; research host could not resolve—re-check before wiring. |
| **Docs** | https://rsync-builder.xyz/ · https://rsync-builder.xyz/docs |
| **Subscribe private bundles?** | **NO** |

---

## 8. builder0x69

| Field | Value |
| --- | --- |
| **URLs (historical)** | `https://builder0x69.io/` |
| **Auth** | Historical: open JSON-RPC submit |
| **Status 2026-09-20** | Cloudflare DoH **SERVFAIL** / broken delegation for `builder0x69.io`. Treat as **DEAD / UNKNOWN**—do not plan POC path. |
| **Subscribe private bundles?** | **NO** (endpoint likely offline) |
| **Docs** | Was https://docs.builder0x69.io/ (unreachable) |

---

## 9. bloXroute (ETH + BSC private tx / BDN / BackRunMe)

| Field | Value |
| --- | --- |
| **URLs** | Cloud: `https://api.blxrbdn.com` (HTTPS/WSS). ETH: `blxr_private_tx`. BSC: `bsc_private_tx`. Regional e.g. `wss://virginia.eth.blxrbdn.com/ws`. BackRunMe: `wss://backrunme.blxrbdn.com/ws` method **`arbOnlyMEV`**. MEV-Boost relays: `bloxroute.max-profit.blxrbdn.com`, `bloxroute.regulated.blxrbdn.com`. Bundles: `blxr_submit_bundle` (see docs). Live probe: API returns auth error without header (up). |
| **Auth** | **Required:** `Authorization: <YOUR-AUTHORIZATION-HEADER>` from bloXroute portal. Commercial plans; Gateway optional (**no spend this POC**). |
| **Third-party (no account)** | Nothing useful. |
| **Paid searcher** | **SUBMIT** private txs/bundles; **PRIVILEGED-STREAM** of (a) BDN `newTxs`/`pendingTxs` (faster public-adjacent mempool—**not** full private OF), (b) BackRunMe `arbOnlyMEV`—selected private txs with arb potential, partially exposed for backrun-only use. |
| **Rate limits / pricing** | Plan-based. Marketing has cited ~**$300/mo** per ETH `newTxs` concurrent stream, Gateway ~**$1,500/mo**—verify https://bloxroute.com/pricing/. |
| **Access** | **Commercial** (free tier: **UNKNOWN**—do not assume). |
| **Docs** | https://docs.bloxroute.com/eth/sending-transactions/frontrunning-protection · https://docs.bloxroute.com/bsc/submit-transactions/bsc-private-transactions · https://docs.bloxroute.com/backrunme-program/arbonlymev · https://docs.bloxroute.com/core-solutions/accessing-the-bdn/cloud-api |
| **Subscribe private bundles?** | **NO without commercial access.** Even then: selected backrunable private txs—not a full dump of all builder private bundles. |

---

## 10. Eden Network

| Field | Value |
| --- | --- |
| **Status** | **DEAD / EXITED (Aug 2025).** Do not plan POC ingress. |
| **Subscribe private bundles?** | **N/A** |

---

## 11. PBS / MEV-Boost Relays (validator-facing; observer = POST-HOC)

**Not** searcher private-mempool subscribe APIs. Third parties can usually read **Data API bid traces after delivery**.

### Common Data API (Flashbots relay schema family)

- `GET /relay/v1/data/bidtraces/proposer_payload_delivered`
- `GET /relay/v1/data/bidtraces/builder_blocks_received`

Verified live (2026-09-20): Ultrasound, Flashbots, Aestus, Titanrelay returned JSON for `proposer_payload_delivered?limit=1`.

| Relay | MEV-Boost URL (pubkey@host) | Observer | Censorship (Coincashew-style lists) | Subscribe private OF? |
| --- | --- | --- | --- | --- |
| **Flashbots** | `0xac6e77dfe25ecd6110b8e780608cce0dab71fdd5ebea22a16c0205200f2f8e2e3ad3b71d3499c54ad14d6c21b41a37ae@boost-relay.flashbots.net` | **POST-HOC** | Filtering flagged ❌ | **NO** |
| **Ultrasound** | `0xa1559ace749633b997cb3fdacffb890aeebdb0f5a3b6aaa7eeeaf1a38af0a8fe88b9e4b1f61f236d2e64d95733327a62@relay.ultrasound.money` | **POST-HOC** | Non-censoring ✅ | **NO** |
| **Agnostic** | `0xa7ab7a996c8584251c8f925da3170bdfd6ebc75d50f5ddc4050a6fdc77f2a3b5fce2cc750d0865e05d7228af97d69561@agnostic-relay.net` | **POST-HOC** | Non-censoring ✅ | **NO** |
| **Aestus** | `0xa15b52576bcbf1072f4a011c0f99f9fb6c66f3e1ff321f11f461d15e31b1cb359caa092c71bbded0bae5b5ea401aab7e@aestus.live` | **POST-HOC** | Non-censoring ✅ | **NO** |
| **Titan Relay** | `0x8c4ed5e24fe5c6ae21018437bde147693f68cda427cd1122cf20819c30eda7ed74f72dece09bb313f2a1855595ab677d@titanrelay.xyz` | **POST-HOC** | Non-censoring ✅ | **NO** |
| **bloXroute Max Profit** | `0x8b5d2e73e2a3a55c6c87b8b6eb92e0149a125c852751db1422fa951e42a09b82c142c3ea98d0d9930b056a3bc9896b8f@bloxroute.max-profit.blxrbdn.com` | **POST-HOC** | Filtering ❌ | **NO** |
| **bloXroute Regulated** | `0xb0b07cd0abef743db4260b0ed50619cf6ad4d82064cb4fbec9d3ec530f7c5e6793d9f286c4e082c0244ffb9f2658fe88@bloxroute.regulated.blxrbdn.com` | **POST-HOC** | Filtering ❌ | **NO** |
| **Manifold SecureRPC** | — | **Deprecated** | N/A | **N/A** |
| **Eden** | — | **Shutdown** | N/A | **N/A** |

**Data API auth:** generally **public GET** (POST may 405). Builder submit / proposer getHeader are role-authenticated.

**Docs / lists:** https://docs.flashbots.net/flashbots-mev-boost/relay · https://docs.coincashew.com/guides/mev-boost/mev-relay-list · https://agnostic-relay.net/ · https://boost-relay.flashbots.net/

---

## 12. Other notable builders (brief)

| Name | URL (commonly cited) | Auth | Observer | Subscribe private OF? | Notes |
| --- | --- | --- | --- | --- | --- |
| Payload | `https://rpc.payload.de` | UNKNOWN | SUBMIT-ONLY expected | **NO** | Confirm docs before use |
| Lightspeed | `https://rpc.lightspeedbuilder.info` | UNKNOWN | SUBMIT-ONLY expected | **NO** | |
| BuildAI | `https://buildai.net` | UNKNOWN | SUBMIT-ONLY expected | **NO** | |
| f1b.io | `https://rpc.f1b.io` | UNKNOWN | SUBMIT-ONLY expected | **NO** | |
| Gambit / gmbit | `https://builder.gmbit.co/rpc` | UNKNOWN | SUBMIT-ONLY expected | **NO** | |
| Kolibrio | `https://eth-rpc.kolibr.io/` | Optional `api_key` | SUBMIT multiplex | **NO** stream | Aggregates builders |

---

## Summary matrix (POC honesty)

| Surface | Public URL? | Stream raw private OF? | Best no-spend Bundle Radar use |
| --- | --- | --- | --- |
| Protect | Yes | No | Canary txs; hint/refund settings |
| Flashbots Relay | Yes | No | Signed canaries; sim |
| MEV-Share SSE | Yes | **Hints only** | **Primary live signal** |
| BuilderNet | Yes | No (narrow propAMM) | Canaries + refund transparency |
| Titan / Beaver / rsync | Yes* | No | Canary multiplex (*rsync DNS TBD) |
| builder0x69 | Unresolved | No | Skip |
| bloXroute | Gated | Commercial BackRunMe/BDN | Out of no-spend scope |
| PBS relays | Yes | No | **Post-hoc** builder share / value |
| Eden | Dead | No | Historical only |

---

## Provenance

- Flashbots Protect / Relay / MEV-Share / rate-limit docs — fetched 2026-09-20  
- BuilderNet send-orderflow + API (`/ws/sendquoteupdate`, `/ws/pamm_quote_stream`) — fetched 2026-09-20  
- Titan / Beaver / rsync public docs — fetched 2026-09-20  
- bloXroute private tx + `arbOnlyMEV` docs — fetched 2026-09-20  
- Coincashew relay list; live Data API probes (Flashbots, Ultrasound, Aestus, Titanrelay)  
- Eden shutdown: secondary news (Aug 2025)  
- DNS: `builder0x69.io` SERVFAIL; `rsync-builder.xyz` no A record (Cloudflare DoH) — 2026-09-20  

**UNKNOWN** labels must be re-validated before production dependence.
