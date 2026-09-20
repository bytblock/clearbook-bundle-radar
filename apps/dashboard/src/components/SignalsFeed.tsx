import type { Signal } from "../hooks/useActionStream";

export function SignalsFeed({ signals }: { signals: Signal[] }) {
  return (
    <div className="panel">
      <h2>Signals feed</h2>
      <p className="footnote" style={{ marginTop: 0 }}>
        paperEvEth = PLACEHOLDER — not promised alpha
      </p>
      <div className="scroll">
        {signals.length === 0 && (
          <p className="muted">Waiting for signals from sim stream…</p>
        )}
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>paperEv</th>
              <th>When</th>
              <th>Rationale</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr key={s.id}>
                <td>
                  <span className="badge HINT">{s.type}</span>
                </td>
                <td className="mono">{s.paperEvEth}</td>
                <td className="mono">{new Date(s.at).toLocaleTimeString()}</td>
                <td style={{ fontSize: "0.75rem", color: "#a3a3a3" }}>
                  {s.rationale}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
