/**
 * mevShareStubAdapter — try public Flashbots MEV-Share SSE (no key required
 * for listen-only per docs: https://mev-share.flashbots.net).
 * On failure / block → stub that explains blocked + emits periodic kind=hint
 * placeholders labeled unavailable.
 *
 * NOTE: Listening to hints ≠ private builder OF (Titan/Beaver). Commercial
 * access still required for real private streams. Bundle submission needs keys.
 */
import type { UnifiedBundleEvent } from "@clearbook/bundle-schema";
import type { Adapter, EmitFn } from "../types.js";
import { fakeTxHash, nowIso, paperScore, uid } from "../util.js";

const DEFAULT_SSE = "https://mev-share.flashbots.net";
const STUB_INTERVAL_MS = 5000;

function hintPlaceholder(reason: string): UnifiedBundleEvent {
  return {
    id: uid("hint"),
    source: "mevShareStubAdapter",
    builder: "flashbots",
    txHashes: [fakeTxHash()],
    receivedAt: nowIso(),
    kind: "hint",
    paperScore: paperScore(90_000, 0.002),
    label: `HINT placeholder · unavailable · ${reason}`,
    raw: {
      paper: true,
      unavailable: true,
      reason,
      docs: "https://docs.flashbots.net/flashbots-mev-share/searchers/event-stream",
      note: "Does not grant Titan/Beaver private OF. Commercial access required for real private streams.",
    },
  };
}

function mapSseToEvent(data: unknown): UnifiedBundleEvent | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const hash =
    typeof d.hash === "string"
      ? d.hash
      : typeof d.txHash === "string"
        ? d.txHash
        : undefined;
  const txs = Array.isArray(d.txs)
    ? (d.txs as unknown[])
        .map((t) =>
          t && typeof t === "object" && "hash" in t
            ? String((t as { hash: unknown }).hash)
            : null
        )
        .filter((x): x is string => !!x)
    : [];
  const txHashes =
    txs.length > 0 ? txs : hash ? [hash] : [fakeTxHash()];

  return {
    id: uid("mevshare"),
    source: "mevShareLive",
    builder: "flashbots",
    txHashes,
    receivedAt: nowIso(),
    kind: "hint",
    paperScore: paperScore(100_000, 0.003),
    label: "MEV-Share public SSE hint (listen-only · not private OF)",
    raw: { ...d, paper: false, listenOnly: true },
  };
}

export function createMevShareStubAdapter(opts?: {
  sseUrl?: string;
  stubIntervalMs?: number;
  tryLive?: boolean;
}): Adapter {
  const sseUrl =
    process.env.MEV_SHARE_SSE_URL?.trim() || opts?.sseUrl || DEFAULT_SSE;
  const stubIntervalMs = opts?.stubIntervalMs ?? STUB_INTERVAL_MS;
  const tryLive = opts?.tryLive !== false && process.env.SKIP_MEV_SHARE !== "1";

  let abort: AbortController | null = null;
  let stubTimer: ReturnType<typeof setInterval> | null = null;
  let live = false;

  const startStub = (emit: EmitFn, reason: string) => {
    if (stubTimer) return;
    console.log(
      `[mevShareStubAdapter] stub mode — ${reason}; emitting kind=hint placeholders every ${stubIntervalMs}ms`
    );
    emit(hintPlaceholder(reason));
    stubTimer = setInterval(
      () => emit(hintPlaceholder(reason)),
      stubIntervalMs
    );
  };

  const tryConnect = async (emit: EmitFn) => {
    if (!tryLive) {
      startStub(emit, "SKIP_MEV_SHARE=1 or tryLive=false");
      return;
    }
    console.log(`[mevShareStubAdapter] trying public SSE: ${sseUrl}`);
    abort = new AbortController();
    try {
      const res = await fetch(sseUrl, {
        headers: { accept: "text/event-stream" },
        signal: abort.signal,
      });
      if (!res.ok || !res.body) {
        startStub(
          emit,
          `SSE HTTP ${res.status} — blocked or unavailable; using placeholders`
        );
        return;
      }
      live = true;
      console.log(
        "[mevShareStubAdapter] connected to public MEV-Share SSE (listen-only)"
      );
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const chunk of parts) {
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith(":")) continue; // ping
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === ":ping") continue;
            try {
              const parsed = JSON.parse(payload) as unknown;
              const ev = mapSseToEvent(parsed);
              if (ev) emit(ev);
            } catch {
              // ignore malformed
            }
          }
        }
      }
      live = false;
      startStub(emit, "SSE stream ended — falling back to placeholders");
    } catch (err) {
      if (abort?.signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[mevShareStubAdapter] SSE connect failed: ${msg}`);
      startStub(
        emit,
        `MEV-Share public SSE unavailable (${msg}) — using PAPER hint placeholders; sim feed still live`
      );
    }
  };

  return {
    name: "mevShareStubAdapter",
    start(emit) {
      void tryConnect(emit);
    },
    stop() {
      abort?.abort();
      abort = null;
      if (stubTimer) clearInterval(stubTimer);
      stubTimer = null;
      console.log(
        `[mevShareStubAdapter] stopped (wasLive=${live})`
      );
    },
  };
}
