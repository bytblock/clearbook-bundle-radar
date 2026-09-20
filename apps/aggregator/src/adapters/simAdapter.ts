/**
 * simAdapter — generates realistic FAKE private-bundle-like events.
 * kind=simulated. PAPER only. Does NOT reflect real Titan/Beaver/Flashbots OF.
 * Occasionally emits large-value / oracle-tagged / echoed-hash events so the
 * action layer produces continuous demo signals.
 */
import type { UnifiedBundleEvent, BundleBuilderId } from "@clearbook/bundle-schema";
import type { Adapter, EmitFn } from "../types.js";
import { fakeTxHash, nowIso, paperScore, uid } from "../util.js";

const BUILDERS: BundleBuilderId[] = ["flashbots", "titan", "beaver", "rsync"];

/** Shared hash for CROSS_BUILDER_ECHO simulation (cleared after echo pair). */
let pendingEchoHash: string | null = null;
let pendingEchoBuilder: BundleBuilderId | null = null;

function randomBuilder(exclude?: BundleBuilderId): BundleBuilderId {
  const pool = exclude ? BUILDERS.filter((b) => b !== exclude) : BUILDERS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function makeSimEvent(): UnifiedBundleEvent {
  const nTx = 1 + Math.floor(Math.random() * 4);
  const gas = 60_000 + Math.floor(Math.random() * 400_000);
  const roll = Math.random();

  // ~18% large value bursts for action-layer demo
  const largeBurst = roll < 0.18;
  // ~12% oracle/resolution keyword tags
  const oracleTag = roll >= 0.18 && roll < 0.30;
  // ~10% start or complete a cross-builder echo
  const echoRoll = roll >= 0.30 && roll < 0.40;

  let valueEth = Number((Math.random() * 0.8).toFixed(6));
  if (largeBurst) {
    valueEth = Number((0.35 + Math.random() * 1.2).toFixed(6));
  }

  let builder = randomBuilder();
  let txHashes = Array.from({ length: nTx }, () => fakeTxHash());
  let label = `PAPER simulated private-bundle-like · builder=${builder} · NOT live OF`;
  const raw: Record<string, unknown> = {
    paper: true,
    note: "Synthetic event for architecture proof. No private OF access.",
  };

  if (oracleTag) {
    label += ` · oracle/resolution window PLACEHOLDER`;
    raw.oracleHint = "resolution";
  }

  if (pendingEchoHash && pendingEchoBuilder) {
    // complete echo with a different builder + same hash
    builder = randomBuilder(pendingEchoBuilder);
    txHashes = [pendingEchoHash, ...txHashes.slice(1)];
    label = `PAPER simulated CROSS_BUILDER_ECHO pair · builders=${pendingEchoBuilder}+${builder} · NOT live OF`;
    raw.echo = true;
    pendingEchoHash = null;
    pendingEchoBuilder = null;
  } else if (echoRoll) {
    pendingEchoHash = fakeTxHash();
    pendingEchoBuilder = builder;
    txHashes = [pendingEchoHash, ...txHashes.slice(1)];
    raw.echoPending = true;
  }

  return {
    id: uid("sim"),
    source: "simAdapter",
    builder,
    txHashes,
    valueEth,
    gas,
    receivedAt: nowIso(),
    kind: "simulated",
    paperScore: paperScore(gas, valueEth * 0.1),
    label,
    raw,
  };
}

export function createSimAdapter(opts?: {
  minMs?: number;
  maxMs?: number;
}): Adapter {
  const minMs = opts?.minMs ?? 1000;
  const maxMs = opts?.maxMs ?? 2000;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const schedule = (emit: EmitFn) => {
    if (stopped) return;
    const delay = minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
    timer = setTimeout(() => {
      emit(makeSimEvent());
      schedule(emit);
    }, delay);
  };

  return {
    name: "simAdapter",
    start(emit) {
      console.log(
        "[simAdapter] starting PAPER simulated private-bundle feed (1–2s) + action-layer hooks"
      );
      schedule(emit);
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
      console.log("[simAdapter] stopped");
    },
  };
}
