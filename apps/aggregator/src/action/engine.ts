/**
 * ActionEngine — wire rules + paper/live paths into the event stream.
 */

import type { UnifiedBundleEvent } from "@clearbook/bundle-schema";
import type { BundleNormalizer } from "../normalizer.js";
import { SignalRules } from "./rules.js";
import { executePaper } from "./paperExecutor.js";
import {
  buildUnsignedTxIntent,
  canLive,
  isKillSwitchOn,
  parseExecutionMode,
} from "./liveGate.js";
import { ActionStore } from "./store.js";
import type { Action, Signal } from "./types.js";
import { uid, nowIso } from "../util.js";

export type ActionFanout = (msg: {
  type: "signal" | "action";
  signal?: Signal;
  action?: Action;
}) => void;

export class ActionEngine {
  readonly store = new ActionStore(300);
  private readonly rules = new SignalRules();
  private readonly fans = new Set<ActionFanout>();
  private unsub: (() => void) | null = null;
  /** Runtime kill (in addition to env KILL_SWITCH). */
  private killed = false;

  constructor(private readonly normalizer: BundleNormalizer) {}

  subscribe(fn: ActionFanout): () => void {
    this.fans.add(fn);
    return () => this.fans.delete(fn);
  }

  setKilled(v: boolean): void {
    this.killed = v;
  }

  isKilled(): boolean {
    return this.killed || isKillSwitchOn();
  }

  start(): void {
    this.unsub = this.normalizer.subscribe((event) => this.onEvent(event));
    console.log(
      `[action] engine started · mode=${parseExecutionMode()} · canLive=${canLive()} · kill=${this.isKilled()}`
    );
  }

  stop(): void {
    this.unsub?.();
    this.unsub = null;
  }

  private fan(msg: { type: "signal" | "action"; signal?: Signal; action?: Action }) {
    for (const f of this.fans) {
      try {
        f(msg);
      } catch (err) {
        console.warn("[action] fanout error", err);
      }
    }
  }

  private onEvent(event: UnifiedBundleEvent): void {
    const recent = this.normalizer.getRecent(40);
    const signals = this.rules.evaluate(event, recent);
    for (const signal of signals) {
      this.store.pushSignal(signal);
      this.fan({ type: "signal", signal });
      const action = this.dispatch(signal);
      this.store.pushAction(action);
      this.fan({ type: "action", action });
    }
  }

  private dispatch(signal: Signal): Action {
    if (this.isKilled()) {
      return {
        id: uid("act"),
        signalId: signal.id,
        signalType: signal.type,
        at: nowIso(),
        status: "KILLED",
        latencyMs: 0,
        rationale: "Kill switch active — no action proposed",
      };
    }

    const mode = parseExecutionMode();
    if (mode === "LIVE") {
      if (!canLive()) {
        return {
          id: uid("act"),
          signalId: signal.id,
          signalType: signal.type,
          at: nowIso(),
          status: "LIVE_BLOCKED",
          latencyMs: 1,
          rationale:
            "LIVE blocked — need ALLOW_LIVE=1 AND EXECUTION_MODE=LIVE AND kill off. Falling back mentally to paper ethos; no broadcast.",
        };
      }
      // LIVE path: unsigned intent only — MetaMask must sign; server does not broadcast
      const unsignedTx = buildUnsignedTxIntent({
        signalId: signal.id,
        paperEvEth: signal.paperEvEth,
      });
      return {
        id: uid("act"),
        signalId: signal.id,
        signalType: signal.type,
        at: nowIso(),
        status: "LIVE_INTENT",
        latencyMs: 5 + Math.floor(Math.random() * 20),
        rationale:
          "LIVE_INTENT — unsigned tx for MetaMask only. Server does NOT hold keys or broadcast.",
        unsignedTx,
      };
    }

    // Default PAPER / sim
    return executePaper(signal);
  }
}
