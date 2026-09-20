export function AnomalyList({
  anomalies,
}: {
  anomalies: Array<{
    type: string;
    message: string;
    at: string;
    severity: string;
  }>;
}) {
  return (
    <div className="panel">
      <h2>Anomalies (PAPER heuristics)</h2>
      {anomalies.length === 0 && (
        <p style={{ color: "#a3a3a3", margin: 0, fontSize: "0.85rem" }}>
          No burst / spike anomalies in the last window.
        </p>
      )}
      {anomalies.map((a, i) => (
        <div
          key={`${a.type}-${a.at}-${i}`}
          className={`anomaly ${a.severity === "info" ? "info" : ""}`}
        >
          <strong>{a.type}</strong> — {a.message}
          <div style={{ color: "#a3a3a3", fontSize: "0.75rem" }}>{a.at}</div>
        </div>
      ))}
      <p className="footnote">
        Burst detection is a local heuristic on the merged PAPER feed — not a
        production risk signal.
      </p>
    </div>
  );
}
