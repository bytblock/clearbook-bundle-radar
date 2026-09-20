/**
 * Signal rules on UnifiedBundleEvent / sim stream.
 * paperEvEth is PLACEHOLDER — not promised alpha.
 */

import type { UnifiedBundleEvent } from "@clearbook/bundle-schema";
import type { Signal, SignalType } from "./types.js";
import { uid, nowIso } from "../util.js";

const LARGE_VALUE_ETH = Number(process.env.SIGNAL_LARGE_VALUE_ETH ?? "0.35");
const ECHO_WINDOW_MS = Number(process.env.SIGNAL_ECHO_WINDOW_MS ?? "15000");
const ORACLE_RE =
  /\b(oracle|resolution|resolve|uma|chainlink|pyth|outcome)\b/i;

interface HashSighting {
  builders: Set<string>;
  eventIds: string[];
  at: number;
  hash: string;
}

export class SignalRules {
  private readonly hashWindow = new Map<string, HashSighting>();
  private readonly seenSignalKeys = new Set<string>();

  /**
   * Inspect one event (+ recent context) and emit zero or more signals.
   */
  evaluate(
    event: UnifiedBundleEvent,
    recent: UnifiedBundleEvent[]
  ): Signal[] {
    const out: Signal[] = [];
    const large = this.detectLargeValue(event);
    if (large) out.push(large);
    const echo = this.detectCrossBuilderEcho(event);
    if (echo) out.push(echo);
    const oracle = this.detectOracleWindow(event);
    if (oracle) out.push(oracle);
    // Use recent length only to keep API flexible / avoid unused lint
    void recent;
    return out;
  }

  private detectLargeValue(event: UnifiedBundleEvent): Signal | null {
    const v = event.valueEth ?? 0;
    if (v < LARGE_VALUE_ETH) return null;
    const key = `lvb:${event.id}`;
    if (this.seenSignalKeys.has(key)) return null;
    this.seenSignalKeys.add(key);
    const paperEvEth = Number((v * 0.02 + Math.random() * 0.005).toFixed(6));
    return makeSignal(
      "LARGE_VALUE_BURST",
      [event.id],
      paperEvEth,
      `valueEth=${v} ≥ threshold ${LARGE_VALUE_ETH} (PAPER heuristic; paperEv PLACEHOLDER)`
    );
  }

  private detectCrossBuilderEcho(event: UnifiedBundleEvent): Signal | null {
    const now = Date.now();
    // prune old
    for (const [h, s] of this.hashWindow) {
      if (now - s.at > ECHO_WINDOW_MS) this.hashWindow.delete(h);
    }

    let found: Signal | null = null;
    for (const hash of event.txHashes ?? []) {
      if (!hash) continue;
      let sight = this.hashWindow.get(hash);
      if (!sight) {
        sight = {
          hash,
          builders: new Set([String(event.builder)]),
          eventIds: [event.id],
          at: now,
        };
        this.hashWindow.set(hash, sight);
        continue;
      }
      sight.builders.add(String(event.builder));
      if (!sight.eventIds.includes(event.id)) sight.eventIds.push(event.id);
      sight.at = now;
      if (sight.builders.size >= 2) {
        const key = `echo:${hash}:${[...sight.builders].sort().join(",")}`;
        if (this.seenSignalKeys.has(key)) continue;
        this.seenSignalKeys.add(key);
        const paperEvEth = Number((0.008 + Math.random() * 0.01).toFixed(6));
        found = makeSignal(
          "CROSS_BUILDER_ECHO",
          sight.eventIds.slice(-4),
          paperEvEth,
          `Same tx hash hint ${hash.slice(0, 12)}… across builders [${[...sight.builders].join(", ")}] (SIMULATED echo; paperEv PLACEHOLDER)`
        );
      }
    }
    return found;
  }

  private detectOracleWindow(event: UnifiedBundleEvent): Signal | null {
    const label = event.label ?? "";
    const rawStr =
      typeof event.raw === "object" && event.raw
        ? JSON.stringify(event.raw)
        : "";
    if (!ORACLE_RE.test(label) && !ORACLE_RE.test(rawStr)) return null;
    const key = `oracle:${event.id}`;
    if (this.seenSignalKeys.has(key)) return null;
    this.seenSignalKeys.add(key);
    const paperEvEth = Number((0.003 + Math.random() * 0.004).toFixed(6));
    return makeSignal(
      "ORACLE_WINDOW_PLACEHOLDER",
      [event.id],
      paperEvEth,
      `Label/raw matched oracle/resolution keywords (PLACEHOLDER window tag — not real oracle arb)`
    );
  }
}

function makeSignal(
  type: SignalType,
  eventIds: string[],
  paperEvEth: number,
  rationale: string
): Signal {
  return {
    id: uid("sig"),
    type,
    at: nowIso(),
    eventIds,
    paperEvEth,
    rationale,
  };
}

export const DEFAULT_LARGE_VALUE_ETH = LARGE_VALUE_ETH;
