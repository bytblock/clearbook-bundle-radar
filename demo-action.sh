#!/usr/bin/env bash
# Clearbook Bundle Radar — action-layer demo: signals / actions / pnl
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PORT="${PORT:-8787}"
BASE="http://127.0.0.1:${PORT}"

echo "=== Bundle Radar ACTION demo (PAPER) ==="
echo "Root: $ROOT"
echo "LIVE default: false (ALLOW_LIVE unset, EXECUTION_MODE=PAPER)"

if [[ ! -d node_modules ]]; then
  echo "→ npm install"
  npm install
fi

if [[ ! -f apps/aggregator/dist/index.js ]] || [[ ! -f apps/aggregator/dist/action/engine.js ]]; then
  echo "→ npm run build"
  npm run build
fi

# Kill anything already on PORT (best-effort)
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
elif command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -t -iTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "${PIDS}" ]]; then kill ${PIDS} 2>/dev/null || true; fi
fi
sleep 0.3

echo "→ starting aggregator on :${PORT} (PAPER, no ALLOW_LIVE)"
SKIP_MEV_SHARE="${SKIP_MEV_SHARE:-1}" \
EXECUTION_MODE="${EXECUTION_MODE:-PAPER}" \
  node apps/aggregator/dist/index.js > /tmp/bundle-radar-action.log 2>&1 &
AGG_PID=$!
cleanup() {
  kill "$AGG_PID" 2>/dev/null || true
  wait "$AGG_PID" 2>/dev/null || true
}
trap cleanup EXIT

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
  cat /tmp/bundle-radar-action.log || true
  exit 1
fi

echo ""
echo "── GET /health (expect allowLive=false, executionMode=PAPER) ──"
curl -sS "$BASE/health" | tee /tmp/bundle-radar-action-health.json
echo ""

# Wait for sim + action engine to produce signals
echo "→ waiting ~12s for signals/actions…"
sleep 12

echo ""
echo "── GET /signals?limit=5 ──"
curl -sS "$BASE/signals?limit=5" | tee /tmp/bundle-radar-signals.json
echo ""

echo ""
echo "── GET /actions?limit=5 ──"
curl -sS "$BASE/actions?limit=5" | tee /tmp/bundle-radar-actions.json
echo ""

echo ""
echo "── GET /pnl/summary ──"
curl -sS "$BASE/pnl/summary" | tee /tmp/bundle-radar-pnl.json
echo ""

# Write DEMO_ACTION_PROOF.md
{
  echo "# Bundle Radar DEMO_ACTION_PROOF"
  echo ""
  echo "**Generated:** $(date '+%Y-%m-%d %H:%M:%S %Z') (box-local / America/Chicago)"
  echo "**Mode:** PAPER (default) — LIVE requires ALLOW_LIVE=1 + EXECUTION_MODE=LIVE + UI toggle"
  echo "**Aggregator PID:** $AGG_PID · port $PORT"
  echo ""
  echo "## Safety confirmations"
  echo ""
  echo "- \`EXECUTION_MODE\` default **PAPER**"
  echo "- \`ALLOW_LIVE\` unset → \`allowLive: false\`, \`canLive: false\`"
  echo "- Server \`holdsPrivateKeys: false\`, does not broadcast"
  echo "- paperEv / PnL = **PLACEHOLDER** — not promised alpha"
  echo "- Sim OF ≠ real private OF; do not sandwich Clearbook users"
  echo ""
  echo "## GET /health"
  echo ""
  echo '```json'
  cat /tmp/bundle-radar-action-health.json
  echo ""
  echo '```'
  echo ""
  echo "## GET /signals?limit=5"
  echo ""
  echo '```json'
  head -c 14000 /tmp/bundle-radar-signals.json
  echo ""
  echo '```'
  echo ""
  echo "## GET /actions?limit=5"
  echo ""
  echo '```json'
  head -c 14000 /tmp/bundle-radar-actions.json
  echo ""
  echo '```'
  echo ""
  echo "## GET /pnl/summary"
  echo ""
  echo '```json'
  head -c 8000 /tmp/bundle-radar-pnl.json
  echo ""
  echo '```'
  echo ""
  echo "## Aggregator log (tail)"
  echo ""
  echo '```'
  tail -n 50 /tmp/bundle-radar-action.log || true
  echo '```'
} > "$ROOT/DEMO_ACTION_PROOF.md"

echo ""
echo "Wrote DEMO_ACTION_PROOF.md"
echo "Action demo OK. Aggregator will stop on exit."
