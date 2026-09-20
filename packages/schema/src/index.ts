/**
 * Clearbook Bundle Radar — Unified event schema
 * PAPER POC. Simulated / hint / public sources only unless live adapters succeed.
 * Never stores private keys. Does NOT grant commercial private OF access.
 */

export type BundleEventKind =
  | "hint"
  | "simulated"
  | "public_mempool"
  | "relay_stats";

export type BundleBuilderId =
  | "flashbots"
  | "titan"
  | "beaver"
  | "rsync"
  | "unknown"
  | "public";

export type BundleEventSource =
  | "simAdapter"
  | "publicMempoolAdapter"
  | "mevShareStubAdapter"
  | "mevShareLive"
  | "aggregator";

/**
 * UnifiedBundleEvent — single shape for all adapters → aggregator → dashboard.
 */
export interface UnifiedBundleEvent {
  /** Stable unique id (uuid-ish / source-prefixed). */
  id: string;
  /** Which adapter produced this event. */
  source: BundleEventSource;
  /** Builder / venue label (simulated builders are labeled clearly). */
  builder: BundleBuilderId | string;
  /** Transaction hashes associated with the bundle / hint / block sample. */
  txHashes: string[];
  /** Optional ETH value estimate (PAPER / placeholder — not real EV). */
  valueEth?: number;
  /** Optional gas used / gas limit sample. */
  gas?: number;
  /** ISO-8601 or epoch-ms receive time at aggregator. */
  receivedAt: string;
  /**
   * Event provenance kind:
   * - simulated: fake private-bundle-like (PAPER)
   * - hint: MEV-Share style hint / placeholder when live SSE unavailable
   * - public_mempool: public RPC / mempool observation
   * - relay_stats: aggregate / stats-only
   */
  kind: BundleEventKind;
  /** Optional opaque payload for debugging (never secrets). */
  raw?: unknown;
  /** PAPER tip / score placeholder for ranked panel (NOT real EV). */
  paperScore?: number;
  /** Human label when data is unavailable or stubbed. */
  label?: string;
}

export function isUnifiedBundleEvent(v: unknown): v is UnifiedBundleEvent {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.source === "string" &&
    typeof e.builder === "string" &&
    Array.isArray(e.txHashes) &&
    typeof e.receivedAt === "string" &&
    typeof e.kind === "string"
  );
}

export const KIND_BADGE: Record<BundleEventKind, string> = {
  simulated: "SIM",
  public_mempool: "PUBLIC",
  hint: "HINT",
  relay_stats: "STATS",
};
