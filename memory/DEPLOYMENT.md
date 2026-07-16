# DEPLOYMENT.md — gem2i

## Server (ISOLATED — gem2i only)
| Field | Value |
|---|---|
| IP | **34.198.159.54** (AWS Lightsail, snapshot-clone of beta-carlos, wiped for gem2i) |
| SSH | `ssh -i "C:\2026\Acapitalgroup.com_Emergent_Claude\Instancias-Keys-SSH\Gem2i-LightsailDefaultKey-us-east-1.pem" ubuntu@34.198.159.54` |
| Ports | SSH 22 / HTTP 80 / HTTPS 443 (backend 8050 internal only) |
| Domain | beta.gem2i.com |
| Deploy dir | /opt/beta.gem2i.com |
| systemd | gem2i-backend (uvicorn server:app :8050) |
| MongoDB | gem2i_cms (local mongod) |
| Health | `https://beta.gem2i.com/api/health` → 200 |

⚠ **NEVER** deploy to or touch the brand boxes: carlos 34.238.109.173 · aurex 18.232.233.16 · acapital 52.55.141.150. The provision script hard-refuses those IPs.

## Scripts
- **`provision_gem2i_box.ps1`** — one-time lifecycle.
  - `-Inventory` — SAFE read-only report (run first).
  - `-Clean -IUnderstand` — wipe all app dirs/vhosts/certs/custom services + drop non-system Mongo DBs; keeps Python/Node/nginx/Mongo/certbot. Stages a pre-clean backup in `/opt/_preclean_backup`.
  - `-Standup -IUnderstand` — upload forked code, venv+build, systemd unit, nginx vhost (from `scripts/gem2i_nginx.conf`), LE cert, health check.
- **`deploy_beta_gem2i.ps1 [-y]`** — ongoing smart deploy (git-diff since `.last-deploy-gem2i`; upload → conditional pip/yarn/build → restart → health → auto-rollback).

## First stand-up order (on GO)
1. `provision_gem2i_box.ps1 -Inventory` → review.
2. `provision_gem2i_box.ps1 -Clean -IUnderstand`.
3. Fork code locally (AUX-1.0 backend/frontend → strip → build-verify) + create `scripts/gem2i_nginx.conf`.
4. `provision_gem2i_box.ps1 -Standup -IUnderstand`.
5. `git init` + GitHub repo + first push.

## Known issues / lessons (inherited)
- **PS 5.1 + native stderr:** don't redirect a native exe's stderr; the deploy scripts already merge pip/yarn stderr server-side.
- **Never inline nginx config in a PowerShell double-quoted heredoc** (`$host` expands) — write via scp from `scripts/gem2i_nginx.conf`.
- **Moving a Python venv dir breaks its shebangs** (203/EXEC) — recreate the venv or sed the shebangs.
- Build on-box can OOM on small instances — `NODE_OPTIONS=--max_old_space_size=2048` is set.
