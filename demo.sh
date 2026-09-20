#!/usr/bin/env bash
# Clearbook Bundle Radar — demo: start aggregator, curl health + events
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PORT="${PORT:-8787}"
BASE="http://127.0.0.1:${PORT}"

echo "=== Bundle Radar demo (PAPER) ==="
echo "Root: $ROOT"

if [[ ! -d node_modules ]]; then
  echo "→ npm install"
  npm install
fi

if [[ ! -f apps/aggregator/dist/index.js ]]; then
  echo "→ npm run build (schema + aggregator)"
  npm run build:schema
  npm run build:aggregator
fi

# Kill anything already on PORT (best-effort)
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
elif command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -t -iTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "${PIDS}" ]]; then kill ${PIDS} 2>/dev/null || true; fi
fi
sleep 0.3

echo "→ starting aggregator on :${PORT}"
SKIP_MEV_SHARE="${SKIP_MEV_SHARE:-1}" \
  node apps/aggregator/dist/index.js > /tmp/bundle-radar-agg.log 2>&1 &
AGG_PID=$!
cleanup() {
  kill "$AGG_PID" 2>/dev/null || true
  wait "$AGG_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Wait for health
ok=0
for i in $(seq 1 30); do
  if curl -sf "$BASE/health" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 0.4
done

if [[ "$ok" -ne 1 ]]; then
  echo "ERROR: aggregator did not become healthy"
  cat /tmp/bundle-radar-agg.log || true
  exit 1
fi

echo ""
echo "── GET /health ──"
curl -sS "$BASE/health" | tee /tmp/bundle-radar-health.json
echo ""
echo ""

# Let simAdapter emit a few events
sleep 3

echo "── GET /events?limit=10 ──"
curl -sS "$BASE/events?limit=10" | tee "$ROOT/SAMPLE_EVENTS.json"
echo ""

# Write DEMO_PROOF.md
{
  echo "# Bundle Radar DEMO_PROOF"
  echo ""
  echo "**Generated:** $(date '+%Y-%m-%d %H:%M:%S %Z') (box-local / America/Chicago)"
  echo "**Mode:** PAPER POC — simulated private OF; not production; no live searcher"
  echo "**Aggregator PID:** $AGG_PID · port $PORT"
  echo ""
  echo "## GET /health"
  echo ""
  echo '```json'
  cat /tmp/bundle-radar-health.json
  echo ""
  echo '```'
  echo ""
  echo "## GET /events?limit=10"
  echo ""
  echo '```json'
  head -c 12000 "$ROOT/SAMPLE_EVENTS.json"
  echo ""
  echo '```'
  echo ""
  echo "## Notes"
  echo ""
  echo "- \`SKIP_MEV_SHARE=${SKIP_MEV_SHARE:-1}\` for deterministic demo (hint placeholders if stub)."
  echo "- \`ETH_RPC_URL\` unset → publicMempoolAdapter no-op (logged)."
  echo "- Simulated events labeled \`kind=simulated\`."
  echo "- This does **not** grant Titan/Beaver private OF."
  echo ""
  echo "## Aggregator log (tail)"
  echo ""
  echo '```'
  tail -n 40 /tmp/bundle-radar-agg.log || true
  echo '```'
} > "$ROOT/DEMO_PROOF.md"

echo ""
echo "Wrote SAMPLE_EVENTS.json and DEMO_PROOF.md"
echo "Demo OK. Aggregator will stop on exit."
