/**
 * Action-layer types — PAPER-first. paperEvEth is PLACEHOLDER, not real EV.
 */

export type SignalType =
  | "LARGE_VALUE_BURST"
  | "CROSS_BUILDER_ECHO"
  | "ORACLE_WINDOW_PLACEHOLDER";

export interface Signal {
  id: string;
  type: SignalType;
  at: string;
  eventIds: string[];
  /** PLACEHOLDER paper EV in ETH — NOT promised alpha / not real EV. */
  paperEvEth: number;
  rationale: string;
}

export type ActionStatus =
  | "PAPER_FILLED"
  | "PAPER_SKIPPED"
  | "LIVE_INTENT"
  | "LIVE_BLOCKED"
  | "KILLED";

export interface UnsignedTxIntent {
  to: string;
  data: string;
  value: string;
  chainId: number;
}

export interface Action {
  id: string;
  signalId: string;
  signalType: SignalType;
  at: string;
  status: ActionStatus;
  fillPriceEth?: number;
  pnlEth?: number;
  latencyMs: number;
  rationale: string;
  /** Only present for LIVE_INTENT — for MetaMask; never broadcast by server. */
  unsignedTx?: UnsignedTxIntent;
}

export interface PnlSummary {
  mode: string;
  allowLive: boolean;
  killSwitch: boolean;
  cumulativePnlEth: number;
  filledCount: number;
  skippedCount: number;
  liveIntentCount: number;
  blockedCount: number;
  killedCount: number;
  signalCount: number;
  actionCount: number;
  /** PLACEHOLDER disclaimer */
  disclaimer: string;
  series: Array<{ at: string; cumulativePnlEth: number }>;
}

export type ExecutionMode = "PAPER" | "LIVE";
