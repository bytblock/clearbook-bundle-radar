import { useCallback, useEffect, useRef, useState } from "react";

export interface Signal {
  id: string;
  type: string;
  at: string;
  eventIds: string[];
  paperEvEth: number;
  rationale: string;
}

export interface Action {
  id: string;
  signalId: string;
  signalType: string;
  at: string;
  status: string;
  fillPriceEth?: number;
  pnlEth?: number;
  latencyMs: number;
  rationale: string;
  unsignedTx?: {
    to: string;
    data: string;
    value: string;
    chainId: number;
  };
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
  disclaimer: string;
  series: Array<{ at: string; cumulativePnlEth: number }>;
}

export interface HealthInfo {
  allowLive: boolean;
  canLive: boolean;
  executionMode: string;
  killSwitch: boolean;
  chains: Array<{ id: number; name: string; hex: string }>;
  holdsPrivateKeys: boolean;
  broadcastsFromServer: boolean;
}

const MAX = 100;

function wsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const override = import.meta.env.VITE_AGGREGATOR_WS as string | undefined;
  if (override) return override;
  return `${proto}//${window.location.host}/stream`;
}

function httpBase(): string {
  const override = import.meta.env.VITE_AGGREGATOR_HTTP as string | undefined;
  if (override) return override.replace(/\/$/, "");
  return "/api";
}

export function useActionStream() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [pnl, setPnl] = useState<PnlSummary | null>(null);
  const [health, setHealth] = useState<HealthInfo>({
    allowLive: false,
    canLive: false,
    executionMode: "PAPER",
    killSwitch: false,
    chains: [],
    holdsPrivateKeys: false,
    broadcastsFromServer: false,
  });
  const seenSig = useRef(new Set<string>());
  const seenAct = useRef(new Set<string>());

  const pushSignal = useCallback((s: Signal) => {
    if (seenSig.current.has(s.id)) return;
    seenSig.current.add(s.id);
    setSignals((prev) => {
      const next = [s, ...prev];
      if (next.length > MAX) {
        for (const d of next.slice(MAX)) seenSig.current.delete(d.id);
        return next.slice(0, MAX);
      }
      return next;
    });
  }, []);

  const pushAction = useCallback((a: Action) => {
    if (seenAct.current.has(a.id)) return;
    seenAct.current.add(a.id);
    setActions((prev) => {
      const next = [a, ...prev];
      if (next.length > MAX) {
        for (const d of next.slice(MAX)) seenAct.current.delete(d.id);
        return next.slice(0, MAX);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const refreshHttp = () => {
      void fetch(`${httpBase()}/health`)
        .then((r) => r.json())
        .then((j) =>
          setHealth({
            allowLive: Boolean(j.allowLive),
            canLive: Boolean(j.canLive),
            executionMode: String(j.executionMode ?? j.mode ?? "PAPER"),
            killSwitch: Boolean(j.killSwitch),
            chains: Array.isArray(j.chains) ? j.chains : [],
            holdsPrivateKeys: false,
            broadcastsFromServer: false,
          })
        )
        .catch(() => undefined);
      void fetch(`${httpBase()}/pnl/summary`)
        .then((r) => r.json())
        .then((j: PnlSummary) => setPnl(j))
        .catch(() => undefined);
    };

    void fetch(`${httpBase()}/signals?limit=40`)
      .then((r) => r.json())
      .then((j: { signals?: Signal[] }) => {
        for (const s of (j.signals ?? []).reverse()) pushSignal(s);
      })
      .catch(() => undefined);

    void fetch(`${httpBase()}/actions?limit=40`)
      .then((r) => r.json())
      .then((j: { actions?: Action[] }) => {
        for (const a of (j.actions ?? []).reverse()) pushAction(a);
      })
      .catch(() => undefined);

    refreshHttp();

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(wsUrl());
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(String(msg.data)) as {
            type?: string;
            signal?: Signal;
            action?: Action;
            allowLive?: boolean;
            canLive?: boolean;
            mode?: string;
            killSwitch?: boolean;
            chains?: HealthInfo["chains"];
          };
          if (data.type === "hello") {
            setHealth((h) => ({
              ...h,
              allowLive: Boolean(data.allowLive),
              canLive: Boolean(data.canLive),
              executionMode: String(data.mode ?? h.executionMode),
              killSwitch: Boolean(data.killSwitch),
              chains: data.chains ?? h.chains,
            }));
          }
          if (data.type === "signal" && data.signal) pushSignal(data.signal);
          if (data.type === "action" && data.action) {
            pushAction(data.action);
            // refresh pnl on action
            void fetch(`${httpBase()}/pnl/summary`)
              .then((r) => r.json())
              .then((j: PnlSummary) => setPnl(j))
              .catch(() => undefined);
          }
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws?.close();
    };

    connect();
    const poll = setInterval(refreshHttp, 8000);

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      clearInterval(poll);
      ws?.close();
    };
  }, [pushSignal, pushAction]);

  const engageKill = useCallback(async () => {
    await fetch(`${httpBase()}/action/kill`, { method: "POST" });
    setHealth((h) => ({ ...h, killSwitch: true }));
  }, []);

  const clearKill = useCallback(async () => {
    await fetch(`${httpBase()}/action/unkill`, { method: "POST" });
    setHealth((h) => ({ ...h, killSwitch: false }));
  }, []);

  return { signals, actions, pnl, health, engageKill, clearKill };
}
