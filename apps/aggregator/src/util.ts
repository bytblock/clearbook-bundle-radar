import { randomBytes } from "node:crypto";

export function uid(prefix = "evt"): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

export function fakeTxHash(): string {
  return "0x" + randomBytes(32).toString("hex");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** PAPER score placeholder — NOT real EV. gas * random tip factor. */
export function paperScore(gas?: number, tipEth?: number): number {
  const g = gas ?? 80_000 + Math.floor(Math.random() * 200_000);
  const tip = tipEth ?? Math.random() * 0.05;
  return Number((g * tip * 1e-6 + Math.random() * 0.01).toFixed(6));
}
