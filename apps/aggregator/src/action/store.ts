/**
 * In-memory ring buffers for signals + actions + PnL series.
 */

import type { Action, PnlSummary, Signal } from "./types.js";
import {
  allowLiveFlag,
  isKillSwitchOn,
  parseExecutionMode,
} from "./liveGate.js";

const DISCLAIMER =
  "Paper PnL is PLACEHOLDER — not promised alpha. Sim OF ≠ real private OF.";

export class ActionStore {
  private signals: Signal[] = [];
  private actions: Action[] = [];
  private series: Array<{ at: string; cumulativePnlEth: number }> = [];
  private cumulativePnlEth = 0;
  private readonly maxSize: number;

  private filledCount = 0;
  private skippedCount = 0;
  private liveIntentCount = 0;
  private blockedCount = 0;
  private killedCount = 0;

  constructor(maxSize = 300) {
    this.maxSize = maxSize;
  }

  pushSignal(s: Signal): void {
    this.signals.push(s);
    if (this.signals.length > this.maxSize) {
      this.signals.splice(0, this.signals.length - this.maxSize);
    }
  }

  pushAction(a: Action): void {
    this.actions.push(a);
    if (this.actions.length > this.maxSize) {
      this.actions.splice(0, this.actions.length - this.maxSize);
    }
    switch (a.status) {
      case "PAPER_FILLED":
        this.filledCount++;
        if (typeof a.pnlEth === "number") {
          this.cumulativePnlEth = Number(
            (this.cumulativePnlEth + a.pnlEth).toFixed(6)
          );
          this.series.push({
            at: a.at,
            cumulativePnlEth: this.cumulativePnlEth,
          });
          if (this.series.length > this.maxSize) {
            this.series.splice(0, this.series.length - this.maxSize);
          }
        }
        break;
      case "PAPER_SKIPPED":
        this.skippedCount++;
        break;
      case "LIVE_INTENT":
        this.liveIntentCount++;
        break;
      case "LIVE_BLOCKED":
        this.blockedCount++;
        break;
      case "KILLED":
        this.killedCount++;
        break;
    }
  }

  getSignals(limit = 50): Signal[] {
    const n = Math.max(0, Math.min(limit, this.signals.length));
    return this.signals.slice(-n).reverse();
  }

  getActions(limit = 50): Action[] {
    const n = Math.max(0, Math.min(limit, this.actions.length));
    return this.actions.slice(-n).reverse();
  }

  getPnlSummary(): PnlSummary {
    return {
      mode: parseExecutionMode(),
      allowLive: allowLiveFlag(),
      killSwitch: isKillSwitchOn(),
      cumulativePnlEth: this.cumulativePnlEth,
      filledCount: this.filledCount,
      skippedCount: this.skippedCount,
      liveIntentCount: this.liveIntentCount,
      blockedCount: this.blockedCount,
      killedCount: this.killedCount,
      signalCount: this.signals.length,
      actionCount: this.actions.length,
      disclaimer: DISCLAIMER,
      series: this.series.slice(-100),
    };
  }
}
