import type { Action } from "../hooks/useActionStream";
import { useMetaMask } from "../hooks/useMetaMask";

export function ActionsLog({
  actions,
  uiLive,
}: {
  actions: Action[];
  uiLive: boolean;
}) {
  const { proposeTx, address } = useMetaMask();

  return (
    <div className="panel">
      <h2>Actions log</h2>
      <p className="footnote" style={{ marginTop: 0 }}>
        saw signal → did action → pnl (PAPER fills are fake)
      </p>
      <div className="scroll">
        {actions.length === 0 && (
          <p className="muted">No actions yet…</p>
        )}
        <table>
          <thead>
            <tr>
              <th>Saw</th>
              <th>Did</th>
              <th>PnL</th>
              <th>ms</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id}>
                <td>
                  <span className="badge SIM">{a.signalType}</span>
                </td>
                <td>
                  <span
                    className={`badge ${
                      a.status === "PAPER_FILLED"
                        ? "PUBLIC"
                        : a.status === "PAPER_SKIPPED"
                          ? "STATS"
                          : a.status === "LIVE_INTENT"
                            ? "HINT"
                            : "SIM"
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="mono">
                  {typeof a.pnlEth === "number" ? a.pnlEth : "—"}
                </td>
                <td className="mono">{a.latencyMs}</td>
                <td>
                  {a.status === "LIVE_INTENT" && a.unsignedTx && uiLive && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={!address}
                      onClick={() => void proposeTx(a.unsignedTx!)}
                      title="Propose to MetaMask — you sign"
                    >
                      Sign in MM
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
