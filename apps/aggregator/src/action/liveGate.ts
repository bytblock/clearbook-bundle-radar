/**
 * LIVE gate — canLive() is false unless ALLOW_LIVE=1.
 * Live path only builds unsigned tx intents for MetaMask.
 * Server NEVER holds private keys and NEVER broadcasts.
 */

import type { ExecutionMode, UnsignedTxIntent } from "./types.js";
import { resolveChainId, SUPPORTED_CHAINS } from "./chains.js";

export function parseExecutionMode(
  raw: string | undefined = process.env.EXECUTION_MODE
): ExecutionMode {
  const v = (raw ?? "PAPER").trim().toLowerCase();
  if (v === "live") return "LIVE";
  // paper | sim | anything else → PAPER
  return "PAPER";
}

export function isKillSwitchOn(): boolean {
  return process.env.KILL_SWITCH === "1" || process.env.KILL_SWITCH === "true";
}

/**
 * LIVE requires explicit env ALLOW_LIVE=1.
 * UI toggle is a separate client-side gate; server still only proposes intents.
 */
export function canLive(): boolean {
  if (isKillSwitchOn()) return false;
  if (process.env.ALLOW_LIVE !== "1" && process.env.ALLOW_LIVE !== "true") {
    return false;
  }
  return parseExecutionMode() === "LIVE";
}

export function allowLiveFlag(): boolean {
  return (
    (process.env.ALLOW_LIVE === "1" || process.env.ALLOW_LIVE === "true") &&
    !isKillSwitchOn()
  );
}

/**
 * Build an unsigned tx intent for wallet signing.
 * Placeholder calldata — NOT a real MEV payload. Never broadcast from server.
 */
export function buildUnsignedTxIntent(opts: {
  signalId: string;
  paperEvEth: number;
  chainId?: number;
}): UnsignedTxIntent {
  const chainId = resolveChainId(opts.chainId);
  // Zero-value no-op-style intent pointing at zero address with tagged data.
  // MetaMask must sign; server does not sendRawTransaction.
  const tag = Buffer.from(
    `clearbook-paper-intent:${opts.signalId}:${opts.paperEvEth.toFixed(6)}`,
    "utf8"
  ).toString("hex");
  return {
    to: "0x0000000000000000000000000000000000000000",
    data: "0x" + tag.slice(0, 64).padEnd(64, "0"),
    value: "0x0",
    chainId,
  };
}

export function liveGateStatus() {
  return {
    executionMode: parseExecutionMode(),
    allowLive: allowLiveFlag(),
    canLive: canLive(),
    killSwitch: isKillSwitchOn(),
    chains: SUPPORTED_CHAINS,
    holdsPrivateKeys: false,
    broadcastsFromServer: false,
    note: "LIVE requires ALLOW_LIVE=1 + EXECUTION_MODE=LIVE + UI toggle; server only proposes unsigned intents for MetaMask.",
  };
}
