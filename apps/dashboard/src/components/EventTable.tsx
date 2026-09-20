import type { UnifiedBundleEvent } from "@clearbook/bundle-schema";
import { KIND_BADGE } from "@clearbook/bundle-schema";

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}

export function EventTable({ events }: { events: UnifiedBundleEvent[] }) {
  return (
    <div className="panel">
      <h2>Live merged feed</h2>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Source</th>
              <th>Builder</th>
              <th>#Txs</th>
              <th>Kind</th>
              <th>Label</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(0, 80).map((e) => {
              const badge = KIND_BADGE[e.kind] ?? e.kind.toUpperCase();
              return (
                <tr key={e.id}>
                  <td className="mono">{fmtTime(e.receivedAt)}</td>
                  <td className="mono truncate" title={e.source}>
                    {e.source}
                  </td>
                  <td>{e.builder}</td>
                  <td>{e.txHashes.length}</td>
                  <td>
                    <span className={`badge ${badge}`}>{badge}</span>
                  </td>
                  <td className="truncate" title={e.label ?? ""}>
                    {e.label ?? "—"}
                  </td>
                </tr>
              );
            })}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "#a3a3a3" }}>
                  Waiting for events…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
