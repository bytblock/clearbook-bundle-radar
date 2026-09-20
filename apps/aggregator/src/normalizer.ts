/**
 * Normalizer — merges adapter emissions into a ring buffer + fan-out.
 */
import type { UnifiedBundleEvent } from "@clearbook/bundle-schema";
import { isUnifiedBundleEvent } from "@clearbook/bundle-schema";
import type { Adapter, EmitFn } from "./types.js";

export type Subscriber = (event: UnifiedBundleEvent) => void;

export class BundleNormalizer {
  private buffer: UnifiedBundleEvent[] = [];
  private readonly maxSize: number;
  private readonly subscribers = new Set<Subscriber>();
  private readonly adapters: Adapter[] = [];
  private started = false;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  addAdapter(adapter: Adapter): void {
    this.adapters.push(adapter);
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  getRecent(limit = 50): UnifiedBundleEvent[] {
    const n = Math.max(0, Math.min(limit, this.buffer.length));
    return this.buffer.slice(-n).reverse();
  }

  getStats(): {
    totalBuffered: number;
    byKind: Record<string, number>;
    byBuilder: Record<string, number>;
    eventsLast60s: number;
  } {
    const byKind: Record<string, number> = {};
    const byBuilder: Record<string, number> = {};
    const cutoff = Date.now() - 60_000;
    let eventsLast60s = 0;
    for (const e of this.buffer) {
      byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
      byBuilder[String(e.builder)] = (byBuilder[String(e.builder)] ?? 0) + 1;
      if (Date.parse(e.receivedAt) >= cutoff) eventsLast60s++;
    }
    return {
      totalBuffered: this.buffer.length,
      byKind,
      byBuilder,
      eventsLast60s,
    };
  }

  /** Detect simple burst anomalies (PAPER heuristic). */
  getAnomalies(): Array<{
    type: string;
    message: string;
    at: string;
    severity: "info" | "warn";
  }> {
    const anomalies: Array<{
      type: string;
      message: string;
      at: string;
      severity: "info" | "warn";
    }> = [];
    const now = Date.now();
    const windowMs = 10_000;
    const recent = this.buffer.filter(
      (e) => now - Date.parse(e.receivedAt) <= windowMs
    );
    const rate = recent.length / (windowMs / 1000);
    if (rate >= 3) {
      anomalies.push({
        type: "burst_rate",
        message: `Burst: ${recent.length} events in ${windowMs / 1000}s (~${rate.toFixed(1)}/s) — PAPER heuristic`,
        at: new Date().toISOString(),
        severity: "warn",
      });
    }
    const byBuilder: Record<string, number> = {};
    for (const e of recent) {
      byBuilder[String(e.builder)] = (byBuilder[String(e.builder)] ?? 0) + 1;
    }
    for (const [b, c] of Object.entries(byBuilder)) {
      if (c >= 8) {
        anomalies.push({
          type: "builder_spike",
          message: `Builder spike: ${b} produced ${c} events in 10s (PAPER)`,
          at: new Date().toISOString(),
          severity: "info",
        });
      }
    }
    return anomalies;
  }

  private emit: EmitFn = (event) => {
    if (!isUnifiedBundleEvent(event)) {
      console.warn("[normalizer] dropped invalid event");
      return;
    }
    this.buffer.push(event);
    if (this.buffer.length > this.maxSize) {
      this.buffer.splice(0, this.buffer.length - this.maxSize);
    }
    for (const sub of this.subscribers) {
      try {
        sub(event);
      } catch (err) {
        console.warn("[normalizer] subscriber error", err);
      }
    }
  };

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    console.log(
      `[normalizer] starting ${this.adapters.length} adapters (PAPER-first)`
    );
    for (const a of this.adapters) {
      await a.start(this.emit);
    }
  }

  async stop(): Promise<void> {
    for (const a of this.adapters) {
      await a.stop();
    }
    this.started = false;
  }
}
