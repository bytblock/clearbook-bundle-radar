import { useState } from "react";
import { AnomalyList } from "./components/AnomalyList";
import { Charts } from "./components/Charts";
import { EventTable } from "./components/EventTable";
import { EvPlaceholder } from "./components/EvPlaceholder";
import { WalletBar } from "./components/WalletBar";
import { ModeBadge } from "./components/ModeBadge";
import { SignalsFeed } from "./components/SignalsFeed";
import { ActionsLog } from "./components/ActionsLog";
import { PnlChart } from "./components/PnlChart";
import { useEventStream } from "./hooks/useEventStream";
import { useActionStream } from "./hooks/useActionStream";

export function App() {
  const { events, connected, banner, anomalies } = useEventStream();
  const { signals, actions, pnl, health, engageKill, clearKill } =
    useActionStream();
  const [uiLive, setUiLive] = useState(false);

  return (
    <>
      <div className="banner">{banner}</div>
      <div className="layout">
        <header>
          <h1>Clearbook Bundle Radar</h1>
          <p>
            Aggregator + action layer (PAPER-default). Simulated private OF ≠
            real private OF. paperEv PLACEHOLDER — not promised alpha. Do not
            sandwich Clearbook users.
          </p>
          <div className="meta">
            <span>
              <span className={`dot ${connected ? "ok" : "off"}`} />
              WS {connected ? "connected" : "reconnecting…"}
            </span>
            <span>Events buffered: {events.length}</span>
            <span>Signals: {signals.length}</span>
            <span>Actions: {actions.length}</span>
            <span>
              Badges: <span className="badge SIM">SIM</span>{" "}
              <span className="badge PUBLIC">PUBLIC</span>{" "}
              <span className="badge HINT">HINT</span>
            </span>
          </div>
        </header>

        <div className="grid" style={{ marginTop: "1rem" }}>
          <WalletBar />
          <ModeBadge
            health={health}
            uiLive={uiLive}
            setUiLive={setUiLive}
            onKill={() => void engageKill()}
            onUnkill={() => void clearKill()}
          />
        </div>

        <div className="grid">
          <SignalsFeed signals={signals} />
          <ActionsLog actions={actions} uiLive={uiLive} />
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
          <PnlChart pnl={pnl} />
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
          <EventTable events={events} />
        </div>

        <div className="grid">
          <Charts events={events} />
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <AnomalyList anomalies={anomalies} />
            <EvPlaceholder events={events} />
          </div>
        </div>

        <p className="footnote">
          Ethos: this POC does <strong>not</strong> grant Titan/Beaver private
          orderflow. Commercial access is required for real private streams.
          Never stores private keys. LIVE defaults <strong>false</strong> —
          requires ALLOW_LIVE=1 + UI toggle; MetaMask signs only. $0
          PAPER-first.
        </p>
      </div>
    </>
  );
}
