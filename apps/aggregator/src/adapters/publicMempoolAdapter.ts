/**
 * publicMempoolAdapter — optional public HTTPS eth_blockNumber poll.
 * If ETH_RPC_URL unset → no-op with log. Never requires paid keys.
 */
import type { UnifiedBundleEvent } from "@clearbook/bundle-schema";
import type { Adapter, EmitFn } from "../types.js";
import { nowIso, paperScore, uid } from "../util.js";

async function ethBlockNumber(rpcUrl: string): Promise<string | null> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_blockNumber",
        params: [],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string };
    return json.result ?? null;
  } catch (err) {
    console.warn(
      "[publicMempoolAdapter] RPC call failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export function createPublicMempoolAdapter(opts?: {
  intervalMs?: number;
}): Adapter {
  const intervalMs = opts?.intervalMs ?? 12_000;
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastBlock: string | null = null;

  return {
    name: "publicMempoolAdapter",
    start(emit) {
      const rpc = process.env.ETH_RPC_URL?.trim();
      if (!rpc) {
        console.log(
          "[publicMempoolAdapter] ETH_RPC_URL unset — no-op (skipping public RPC)"
        );
        return;
      }
      console.log(
        `[publicMempoolAdapter] polling eth_blockNumber every ${intervalMs}ms`
      );

      const tick = async () => {
        const block = await ethBlockNumber(rpc);
        if (!block) return;
        if (block === lastBlock) return;
        lastBlock = block;
        const blockNum = Number.parseInt(block, 16);
        const event: UnifiedBundleEvent = {
          id: uid("pub"),
          source: "publicMempoolAdapter",
          builder: "public",
          txHashes: [],
          gas: undefined,
          valueEth: undefined,
          receivedAt: nowIso(),
          kind: "public_mempool",
          paperScore: paperScore(100_000, 0.001),
          label: `Public eth_blockNumber · block=${blockNum}`,
          raw: { blockHex: block, blockNumber: blockNum, paper: false },
        };
        emit(event);
      };

      void tick();
      timer = setInterval(() => void tick(), intervalMs);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      console.log("[publicMempoolAdapter] stopped");
    },
  };
}
