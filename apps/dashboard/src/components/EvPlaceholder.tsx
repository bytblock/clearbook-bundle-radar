import { useMemo } from "react";
import type { UnifiedBundleEvent } from "@clearbook/bundle-schema";

/**
 * Ranked "EV placeholder" panel — clearly PAPER score (gas*random / tip field).
 * NOT real expected value. NOT a trading signal.
 */
export function EvPlaceholder({ events }: { events: UnifiedBundleEvent[] }) {
  const ranked = useMemo(() => {
    return [...events]
      .filter((e) => typeof e.paperScore === "number")
      .sort((a, b) => (b.paperScore ?? 0) - (a.paperScore ?? 0))
      .slice(0, 12);
  }, [events]);

  return (
    <div className="panel">
      <h2>Ranked PAPER score (NOT real EV)</h2>
      <p className="footnote" style={{ marginTop: 0 }}>
        Placeholder = gas × random tip factor (or tip field). Paper only — do
        not trade on this.
      </p>
      {ranked.map((e, idx) => (
        <div className="rank-row" key={e.id}>
          <div>
            <span style={{ color: "#a3a3a3", marginRight: 8 }}>#{idx + 1}</span>
            <strong>{e.builder}</strong>{" "}
            <span style={{ color: "#a3a3a3" }}>({e.kind})</span>
          </div>
          <div className="rank-score">{e.paperScore?.toFixed(6)}</div>
        </div>
      ))}
      {ranked.length === 0 && (
        <p style={{ color: "#a3a3a3", fontSize: "0.85rem" }}>No scores yet.</p>
      )}
    </div>
  );
}
