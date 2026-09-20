/**
 * Clearbook Bundle Radar — Aggregator
 * PAPER-first EOD POC. $0. No private keys. No paid builder keys required.
 * Action layer default EXECUTION_MODE=PAPER. LIVE requires ALLOW_LIVE=1.
 */
import { createSimAdapter } from "./adapters/simAdapter.js";
import { createPublicMempoolAdapter } from "./adapters/publicMempoolAdapter.js";
import { createMevShareStubAdapter } from "./adapters/mevShareStubAdapter.js";
import { BundleNormalizer } from "./normalizer.js";
import { createServer } from "./server.js";
import { ActionEngine } from "./action/engine.js";
import { liveGateStatus, parseExecutionMode } from "./action/liveGate.js";

const PORT = Number(process.env.PORT ?? "8787");

async function main() {
  console.log("=== Clearbook Bundle Radar Aggregator ===");
  console.log("PAPER POC — simulated private OF; not production; no live searcher");
  console.log("Never stores private keys. No paid builder keys required.");
  console.log(
    "This does NOT grant Titan/Beaver private OF — commercial access required for real private streams."
  );
  console.log(
    "Action layer: do not sandwich Clearbook users; paper EV is PLACEHOLDER; sim OF ≠ real private OF."
  );

  const gate = liveGateStatus();
  console.log(
    `[boot] EXECUTION_MODE=${parseExecutionMode()} ALLOW_LIVE→allowLive=${gate.allowLive} canLive=${gate.canLive} kill=${gate.killSwitch}`
  );

  const normalizer = new BundleNormalizer(500);
  normalizer.addAdapter(createSimAdapter({ minMs: 1000, maxMs: 2000 }));
  normalizer.addAdapter(createPublicMempoolAdapter({ intervalMs: 12_000 }));
  normalizer.addAdapter(createMevShareStubAdapter());

  const actionEngine = new ActionEngine(normalizer);

  await normalizer.start();
  actionEngine.start();
  const server = createServer(normalizer, PORT, actionEngine);

  const shutdown = async () => {
    console.log("\n[aggregator] shutting down...");
    actionEngine.stop();
    await normalizer.stop();
    server.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
