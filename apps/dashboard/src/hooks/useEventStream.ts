import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UnifiedBundleEvent } from "@clearbook/bundle-schema";
import { KIND_BADGE } from "@clearbook/bundle-schema";

const MAX_EVENTS = 200;

function wsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  // Vite proxy /stream in dev; allow VITE_AGGREGATOR_WS override
  const override = import.meta.env.VITE_AGGREGATOR_WS as string | undefined;
  if (override) return override;
  return `${proto}//${window.location.host}/stream`;
}

function httpBase(): string {
  const override = import.meta.env.VITE_AGGREGATOR_HTTP as string | undefined;
  if (override) return override.replace(/\/$/, "");
  return "/api";
}

export function useEventStream() {
  const [events, setEvents] = useState<UnifiedBundleEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [banner, setBanner] = useState(
    "PAPER POC — simulated private OF; not production; no live searcher"
  );
  const [anomalies, setAnomalies] = useState<
    Array<{ type: string; message: string; at: string; severity: string }>
  >([]);
  const seen = useRef(new Set<string>());

  const push = useCallback((ev: UnifiedBundleEvent) => {
    if (seen.current.has(ev.id)) return;
    seen.current.add(ev.id);
    setEvents((prev) => {
      const next = [ev, ...prev];
      if (next.length > MAX_EVENTS) {
        for (const drop of next.slice(MAX_EVENTS)) {
          seen.current.delete(drop.id);
        }
        return next.slice(0, MAX_EVENTS);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(wsUrl());
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws?.close();
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(String(msg.data)) as {
            type?: string;
            banner?: string;
            event?: UnifiedBundleEvent;
          };
          if (data.banner) setBanner(data.banner);
          if (data.type === "event" && data.event) push(data.event);
        } catch {
          /* ignore */
        }
      };
    };

    // seed via HTTP
    void fetch(`${httpBase()}/events?limit=50`)
      .then((r) => r.json())
      .then((j: { events?: UnifiedBundleEvent[]; banner?: string }) => {
        if (j.banner) setBanner(j.banner);
        for (const e of (j.events ?? []).reverse()) push(e);
      })
      .catch(() => undefined);

    connect();

    const anomalyPoll = setInterval(() => {
      void fetch(`${httpBase()}/anomalies`)
        .then((r) => r.json())
        .then(
          (j: {
            anomalies?: Array<{
              type: string;
              message: string;
              at: string;
              severity: string;
            }>;
          }) => setAnomalies(j.anomalies ?? [])
        )
        .catch(() => undefined);
    }, 5000);

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      clearInterval(anomalyPoll);
      ws?.close();
    };
  }, [push]);

  const kindBadge = useMemo(() => KIND_BADGE, []);

  return { events, connected, banner, anomalies, kindBadge };
}

declare global {
  interface ImportMetaEnv {
    readonly VITE_AGGREGATOR_WS?: string;
    readonly VITE_AGGREGATOR_HTTP?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
