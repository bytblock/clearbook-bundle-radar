import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PnlSummary } from "../hooks/useActionStream";

export function PnlChart({ pnl }: { pnl: PnlSummary | null }) {
  const data = useMemo(() => {
    const series = pnl?.series ?? [];
    return series.map((p, i) => ({
      i,
      t: new Date(p.at).toLocaleTimeString(),
      cumulativePnlEth: p.cumulativePnlEth,
    }));
  }, [pnl]);

  return (
    <div className="panel">
      <h2>Cumulative paper PnL</h2>
      <div className="meta" style={{ marginTop: 0, marginBottom: 8 }}>
        <span className="rank-score">
          Σ {pnl?.cumulativePnlEth?.toFixed(6) ?? "0"} ETH
        </span>
        <span>filled {pnl?.filledCount ?? 0}</span>
        <span>skipped {pnl?.skippedCount ?? 0}</span>
        <span>signals {pnl?.signalCount ?? 0}</span>
      </div>
      <div style={{ height: 220 }}>
        {data.length === 0 ? (
          <p className="muted">PnL series will appear after PAPER fills…</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
              <XAxis dataKey="t" stroke="#a3a3a3" fontSize={10} />
              <YAxis stroke="#a3a3a3" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#0a0a0a",
                  border: "1px solid #222222",
                }}
              />
              <Line
                type="monotone"
                dataKey="cumulativePnlEth"
                stroke="#fbbf24"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="footnote">
        {pnl?.disclaimer ??
          "Paper PnL is PLACEHOLDER — not promised alpha. Sim OF ≠ real private OF."}
      </p>
    </div>
  );
}
