import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import type { BundleNormalizer } from "./normalizer.js";
import type { ActionEngine } from "./action/engine.js";
import { liveGateStatus } from "./action/liveGate.js";

const BANNER =
  "PAPER POC — simulated private OF; not production; no live searcher; action layer PAPER-default";

export function createServer(
  normalizer: BundleNormalizer,
  port: number,
  actionEngine?: ActionEngine
): http.Server {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Same-origin dashboard uses /api/* (Vite proxy in dev; stripped here in prod)
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      url.pathname = url.pathname === "/api" ? "/" : url.pathname.slice(4) || "/";
    }

    const gate = liveGateStatus();

    if (url.pathname === "/health") {
      const stats = normalizer.getStats();
      const pnl = actionEngine?.store.getPnlSummary();
      json(res, 200, {
        ok: true,
        mode: gate.executionMode,
        executionMode: gate.executionMode,
        allowLive: gate.allowLive,
        canLive: gate.canLive,
        killSwitch: gate.killSwitch || (actionEngine?.isKilled() ?? false),
        holdsPrivateKeys: false,
        broadcastsFromServer: false,
        chains: gate.chains,
        banner: BANNER,
        uptimeSec: Math.floor(process.uptime()),
        actionLayer: Boolean(actionEngine),
        cumulativePnlEth: pnl?.cumulativePnlEth ?? 0,
        ...stats,
      });
      return;
    }

    if (url.pathname === "/events") {
      const limit = Number(url.searchParams.get("limit") ?? "50");
      json(res, 200, {
        mode: gate.executionMode,
        banner: BANNER,
        count: Math.min(limit, 500),
        events: normalizer.getRecent(Number.isFinite(limit) ? limit : 50),
      });
      return;
    }

    if (url.pathname === "/anomalies") {
      json(res, 200, {
        mode: gate.executionMode,
        anomalies: normalizer.getAnomalies(),
      });
      return;
    }

    if (url.pathname === "/stats") {
      json(res, 200, {
        mode: gate.executionMode,
        banner: BANNER,
        ...normalizer.getStats(),
        anomalies: normalizer.getAnomalies(),
        allowLive: gate.allowLive,
      });
      return;
    }

    if (url.pathname === "/signals") {
      const limit = Number(url.searchParams.get("limit") ?? "50");
      json(res, 200, {
        mode: gate.executionMode,
        allowLive: gate.allowLive,
        disclaimer:
          "paperEvEth is PLACEHOLDER — not promised alpha. Sim OF ≠ real private OF.",
        signals: actionEngine?.store.getSignals(
          Number.isFinite(limit) ? limit : 50
        ) ?? [],
      });
      return;
    }

    if (url.pathname === "/actions") {
      const limit = Number(url.searchParams.get("limit") ?? "50");
      json(res, 200, {
        mode: gate.executionMode,
        allowLive: gate.allowLive,
        disclaimer:
          "PAPER fills are simulated. LIVE intents are unsigned for MetaMask only — server never broadcasts.",
        actions: actionEngine?.store.getActions(
          Number.isFinite(limit) ? limit : 50
        ) ?? [],
      });
      return;
    }

    if (url.pathname === "/pnl/summary") {
      json(
        res,
        200,
        actionEngine?.store.getPnlSummary() ?? {
          mode: gate.executionMode,
          allowLive: gate.allowLive,
          killSwitch: gate.killSwitch,
          cumulativePnlEth: 0,
          filledCount: 0,
          skippedCount: 0,
          liveIntentCount: 0,
          blockedCount: 0,
          killedCount: 0,
          signalCount: 0,
          actionCount: 0,
          disclaimer:
            "Paper PnL is PLACEHOLDER — not promised alpha. Sim OF ≠ real private OF.",
          series: [],
        }
      );
      return;
    }

    if (url.pathname === "/action/kill" && req.method === "POST") {
      actionEngine?.setKilled(true);
      json(res, 200, {
        ok: true,
        killSwitch: true,
        note: "Runtime kill engaged — new actions marked KILLED",
      });
      return;
    }

    if (url.pathname === "/action/unkill" && req.method === "POST") {
      actionEngine?.setKilled(false);
      json(res, 200, {
        ok: true,
        killSwitch: actionEngine?.isKilled() ?? false,
        note: "Runtime kill cleared (env KILL_SWITCH still applies if set)",
      });
      return;
    }

    // Static dashboard (PAPER public host)
    const distCandidates = [
      process.env.DASHBOARD_DIST,
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../dashboard/dist"),
      path.resolve(process.cwd(), "apps/dashboard/dist"),
      path.resolve(process.cwd(), "dist/dashboard"),
    ].filter(Boolean) as string[];
    const distDir = distCandidates.find(
      (d) => d && fs.existsSync(path.join(d as string, "index.html"))
    ) as string | undefined;
    if (distDir && req.method === "GET") {
      const rel = url.pathname === "/" ? "/index.html" : url.pathname;
      const filePath = path.join(distDir, rel);
      const normalized = path.normalize(filePath);
      if (normalized.startsWith(path.normalize(distDir)) && fs.existsSync(normalized) && fs.statSync(normalized).isFile()) {
        const ext = path.extname(normalized).toLowerCase();
        const types: Record<string, string> = {
          ".html": "text/html; charset=utf-8",
          ".js": "application/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".svg": "image/svg+xml",
          ".json": "application/json",
          ".png": "image/png",
          ".ico": "image/x-icon",
          ".woff2": "font/woff2",
          ".map": "application/json",
        };
        res.writeHead(200, { "Content-Type": types[ext] ?? "application/octet-stream" });
        fs.createReadStream(normalized).pipe(res);
        return;
      }
      if (!path.extname(url.pathname)) {
        const index = path.join(distDir, "index.html");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        fs.createReadStream(index).pipe(res);
        return;
      }
    }

    json(res, 404, {
      error: "not_found",
      routes: [
        "GET /health",
        "GET /events?limit=50",
        "GET /anomalies",
        "GET /stats",
        "GET /signals?limit=50",
        "GET /actions?limit=50",
        "GET /pnl/summary",
        "POST /action/kill",
        "POST /action/unkill",
        "WS /stream",
        "GET /* (dashboard static)",
      ],
    });
  });

  const wss = new WebSocketServer({ server, path: "/stream" });
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    const gate = liveGateStatus();
    ws.send(
      JSON.stringify({
        type: "hello",
        mode: gate.executionMode,
        allowLive: gate.allowLive,
        canLive: gate.canLive,
        killSwitch: gate.killSwitch || (actionEngine?.isKilled() ?? false),
        chains: gate.chains,
        banner: BANNER,
        at: new Date().toISOString(),
      })
    );
    // seed last few events
    for (const e of normalizer.getRecent(10).reverse()) {
      ws.send(JSON.stringify({ type: "event", event: e }));
    }
    // seed recent signals/actions
    if (actionEngine) {
      for (const s of actionEngine.store.getSignals(5).reverse()) {
        ws.send(JSON.stringify({ type: "signal", signal: s }));
      }
      for (const a of actionEngine.store.getActions(5).reverse()) {
        ws.send(JSON.stringify({ type: "action", action: a }));
      }
    }
    ws.on("close", () => clients.delete(ws));
  });

  const broadcast = (payload: string) => {
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  };

  normalizer.subscribe((event) => {
    broadcast(JSON.stringify({ type: "event", event }));
  });

  actionEngine?.subscribe((msg) => {
    broadcast(JSON.stringify(msg));
  });

  const host = process.env.HOST ?? "0.0.0.0";
  server.listen(port, host, () => {
    const gate = liveGateStatus();
    console.log(`[server] HTTP+WS listening on ${host}:${port}`);
    console.log(`[server] ${BANNER}`);
    console.log(
      `[server] executionMode=${gate.executionMode} allowLive=${gate.allowLive} canLive=${gate.canLive}`
    );
    console.log(
      `[server] GET /health /events /signals /actions /pnl/summary  WS /stream`
    );
  });

  return server;
}

function json(
  res: http.ServerResponse,
  status: number,
  body: unknown
): void {
  const data = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(data);
}
