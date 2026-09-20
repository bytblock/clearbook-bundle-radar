import { useMemo } from "react";
import type { UnifiedBundleEvent } from "@clearbook/bundle-schema";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const KIND_COLORS: Record<string, string> = {
  simulated: "#f5a524",
  public_mempool: "#3dd68c",
  hint: "#a78bfa",
  relay_stats: "#67e8f9",
};

export function Charts({ events }: { events: UnifiedBundleEvent[] }) {
  const byBuilder = useMemo(() => {
    const cutoff = Date.now() - 60_000;
    const counts: Record<string, number> = {};
    for (const e of events) {
      if (Date.parse(e.receivedAt) < cutoff) continue;
      counts[String(e.builder)] = (counts[String(e.builder)] ?? 0) + 1;
    }
    return Object.entries(counts).map(([builder, count]) => ({
      builder,
      perMin: count, // events in last 60s ≈ per-min rate
    }));
  }, [events]);

  const kindMix = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.kind] = (counts[e.kind] ?? 0) + 1;
    }
    return Object.entries(counts).map(([kind, value]) => ({ kind, value }));
  }, [events]);

  return (
    <div className="panel">
      <h2>Charts (PAPER)</h2>
      <div className="charts">
        <div style={{ height: 220 }}>
          <div style={{ fontSize: "0.8rem", color: "#a3a3a3", marginBottom: 4 }}>
            Events / min by builder (last 60s)
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={byBuilder}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
              <XAxis dataKey="builder" stroke="#a3a3a3" fontSize={11} />
              <YAxis stroke="#a3a3a3" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#0a0a0a", border: "1px solid #222222" }}
              />
              <Bar dataKey="perMin" fill="#d4d4d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ height: 220 }}>
          <div style={{ fontSize: "0.8rem", color: "#a3a3a3", marginBottom: 4 }}>
            Kind mix (buffer)
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={kindMix}
                dataKey="value"
                nameKey="kind"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ kind }) => kind}
              >
                {kindMix.map((d) => (
                  <Cell
                    key={d.kind}
                    fill={KIND_COLORS[d.kind] ?? "#d4d4d4"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#0a0a0a", border: "1px solid #222222" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
