import type { HealthInfo } from "../hooks/useActionStream";

export function ModeBadge({
  health,
  uiLive,
  setUiLive,
  onKill,
  onUnkill,
}: {
  health: HealthInfo;
  uiLive: boolean;
  setUiLive: (v: boolean) => void;
  onKill: () => void;
  onUnkill: () => void;
}) {
  const liveEnabled = health.allowLive && !health.killSwitch;
  const effective =
    uiLive && liveEnabled ? "LIVE" : health.executionMode === "LIVE" && liveEnabled && uiLive
      ? "LIVE"
      : "PAPER";

  return (
    <div className="panel mode-badge-panel">
      <h2>Execution mode</h2>
      <div className="mode-row">
        <span className={`mode-pill ${effective === "PAPER" ? "paper" : "live"}`}>
          {effective}
        </span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={uiLive}
            disabled={!liveEnabled}
            onChange={(e) => setUiLive(e.target.checked)}
          />
          UI LIVE toggle
          {!liveEnabled && (
            <span className="muted">
              {" "}
              (disabled — server allowLive=
              {String(health.allowLive)}; need ALLOW_LIVE=1)
            </span>
          )}
        </label>
      </div>
      <div className="meta">
        <span>server mode: {health.executionMode}</span>
        <span>allowLive: {String(health.allowLive)}</span>
        <span>canLive: {String(health.canLive)}</span>
        <span>kill: {String(health.killSwitch)}</span>
        <span>holdsKeys: false</span>
      </div>
      <div className="chain-btns" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-sm btn-danger" onClick={onKill}>
          Kill switch
        </button>
        <button type="button" className="btn btn-sm" onClick={onUnkill}>
          Clear kill
        </button>
      </div>
      <p className="footnote">
        Default is PAPER. LIVE requires env ALLOW_LIVE=1 + UI toggle; server
        still only proposes MetaMask intents — never broadcasts.
      </p>
    </div>
  );
}
