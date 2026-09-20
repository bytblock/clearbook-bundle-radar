/**
 * Paper executor — on signal, create PAPER_FILLED or PAPER_SKIPPED actions.
 * Fake fill price; pnlEth from paperEv with slight random-walk bias.
 * Latency ms simulated.
 */

import type { Action, Signal } from "./types.js";
import { uid, nowIso } from "../util.js";

/** Mild positive bias so demo PnL drifts up slowly (still PLACEHOLDER). */
const BIAS = 0.15;

export function executePaper(signal: Signal): Action {
  const t0 = Date.now();
  const latencyMs = 12 + Math.floor(Math.random() * 80);

  // Skip ~25% of signals (PAPER risk gate)
  const skip = Math.random() < 0.25;
  if (skip) {
    return {
      id: uid("act"),
      signalId: signal.id,
      signalType: signal.type,
      at: nowIso(),
      status: "PAPER_SKIPPED",
      latencyMs,
      rationale: `PAPER skip — risk gate / low confidence on ${signal.type} (paperEv ${signal.paperEvEth} PLACEHOLDER)`,
    };
  }

  const noise = (Math.random() - 0.5 + BIAS) * signal.paperEvEth * 0.8;
  const pnlEth = Number((signal.paperEvEth * 0.55 + noise).toFixed(6));
  const fillPriceEth = Number(
    (0.001 + Math.abs(signal.paperEvEth) + Math.random() * 0.002).toFixed(6)
  );
  // ensure latency at least simulated wall
  void t0;

  return {
    id: uid("act"),
    signalId: signal.id,
    signalType: signal.type,
    at: nowIso(),
    status: "PAPER_FILLED",
    fillPriceEth,
    pnlEth,
    latencyMs,
    rationale: `PAPER fill on ${signal.type} — fake fill @ ${fillPriceEth} ETH; pnlEth=${pnlEth} (PLACEHOLDER, not real alpha)`,
  };
}
