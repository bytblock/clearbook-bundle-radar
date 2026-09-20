# Clearbook Bundle Radar — public PAPER host

## What is public
- Dashboard UI + aggregator HTTP/WS
- `EXECUTION_MODE=PAPER`, `ALLOW_LIVE=false` — no live execution exposed

## Env
| Key | Value |
|-----|-------|
| HOST | 0.0.0.0 |
| PORT | 8787 (Render sets `$PORT` — map start to use it) |
| EXECUTION_MODE | PAPER |
| ALLOW_LIVE | false |
| KILL_SWITCH | false |
| DASHBOARD_DIST | apps/dashboard/dist |

## Redeploy
```bash
git push origin main   # auto-deploy if Blueprint/Git connected
# or: render blueprints launch render.yaml
```

Local smoke:
```bash
npm ci && npm run build
HOST=0.0.0.0 PORT=8787 EXECUTION_MODE=PAPER DASHBOARD_DIST=apps/dashboard/dist npm run start:aggregator
# open http://127.0.0.1:8787/
```
