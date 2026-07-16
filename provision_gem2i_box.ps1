# =============================================================================
#  provision_gem2i_box.ps1  --  ONE-TIME box lifecycle for the gem2i instance
#
#  The box 34.198.159.54 is a snapshot-clone of the beta-carlos instance. It
#  arrives carrying carlos/aurex/acapital app dirs, nginx vhosts, LE certs,
#  systemd services, and a Mongo copy. This script wipes all of that (keeping
#  the Python/Node/nginx/Mongo/certbot RUNTIMES) and stands up a clean, isolated
#  gem2i instance.
#
#  MODES (pick exactly one):
#    -Inventory                 SAFE, read-only. Reports every app dir, nginx
#                               vhost, LE cert, custom systemd unit, and Mongo DB
#                               on the box. RUN THIS FIRST and review it.
#    -Clean      -IUnderstand   DESTRUCTIVE. Removes ALL app artifacts (keeps
#                               runtimes). Requires -IUnderstand.
#    -Standup    -IUnderstand   Creates the fresh gem2i instance from the local
#                               forked code (backend/ + frontend/ must exist).
#                               Requires -IUnderstand.
#
#  SAFETY: hardcoded to 34.198.159.54. Refuses to run if the resolved host does
#  not match. NEVER point this at a brand box.
#
#  Usage:
#    .\provision_gem2i_box.ps1 -Inventory
#    .\provision_gem2i_box.ps1 -Clean   -IUnderstand
#    .\provision_gem2i_box.ps1 -Standup -IUnderstand
# =============================================================================

param(
    [switch]$Inventory,
    [switch]$Clean,
    [switch]$Standup,
    [switch]$IUnderstand
)

Set-StrictMode -Version 1
$ErrorActionPreference = "Stop"

# --- CONFIG (all hardcoded to the gem2i box) --------------------------------
$KEY      = "C:\2026\Acapitalgroup.com_Emergent_Claude\Instancias-Keys-SSH\Gem2i-LightsailDefaultKey-us-east-1.pem"
$SERVER   = "34.198.159.54"          # gem2i box ONLY
$SSHUSER  = "ubuntu"
$LOCAL    = $PSScriptRoot

$DEPLOY_DIR  = "/opt/beta.gem2i.com"
$DEPLOY_SVC  = "gem2i-backend"
$DEPLOY_PORT = "8050"
$DOMAIN      = "beta.gem2i.com"
$DEPLOY_URL  = "https://$DOMAIN"
$MONGO_DB    = "gem2i_cms"

# Brand boxes this script must NEVER touch (guard list)
$FORBIDDEN = @("34.238.109.173","18.232.233.16","52.55.141.150")

function Write-Banner { param($m) Write-Host "`n  == $m" -ForegroundColor Cyan }
function Write-OK   { param($m) Write-Host "     OK  $m" -ForegroundColor Green }
function Write-Warn { param($m) Write-Host "     >>  $m" -ForegroundColor Yellow }
function Write-Info { param($m) Write-Host "     ->  $m" -ForegroundColor Gray }
function Write-Fail { param($m) Write-Host "     XX  $m" -ForegroundColor Red }

function Invoke-SSH {
    param([string]$Cmd, [switch]$AllowFail)
    $out = ssh -n -i $KEY -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=25 `
               "${SSHUSER}@${SERVER}" $Cmd 2>$null
    if (-not $AllowFail -and $LASTEXITCODE -ne 0) {
        throw "SSH failed (exit $LASTEXITCODE)`nCmd: $Cmd`nOut: $($out -join ' ')"
    }
    return $out
}

# --- GUARDS ------------------------------------------------------------------
if ($FORBIDDEN -contains $SERVER) { Write-Fail "SERVER is a brand box. ABORT."; exit 1 }
$modeCount = @($Inventory,$Clean,$Standup | Where-Object { $_ }).Count
if ($modeCount -ne 1) { Write-Fail "Pick exactly one mode: -Inventory | -Clean | -Standup"; exit 1 }
if (-not (Test-Path $KEY)) { Write-Fail "SSH key not found: $KEY"; exit 1 }
if (($Clean -or $Standup) -and -not $IUnderstand) {
    Write-Fail "Destructive mode requires -IUnderstand. Run -Inventory first."; exit 1
}

Write-Host ""
Write-Host "  ==========================================================" -ForegroundColor White
Write-Host "   gem2i box provisioning  --  $SERVER" -ForegroundColor White
Write-Host "  ==========================================================" -ForegroundColor White

# =============================================================================
#  -Inventory  (SAFE, read-only)
# =============================================================================
if ($Inventory) {
    Write-Banner "Connecting (read-only)"
    Invoke-SSH "echo ok" | Out-Null
    Write-OK "SSH established to $SERVER"

    Write-Banner "Hostname / uptime"
    (Invoke-SSH "hostname; uptime") | ForEach-Object { Write-Info $_ }

    Write-Banner "Runtimes present (must survive the clean)"
    (Invoke-SSH "python3 --version 2>&1; node --version 2>&1; yarn --version 2>&1; nginx -v 2>&1; mongod --version 2>&1 | head -1; certbot --version 2>&1") | ForEach-Object { Write-Info $_ }

    Write-Banner "/opt app directories"
    (Invoke-SSH "ls -1 /opt 2>/dev/null") | ForEach-Object { Write-Info $_ }

    Write-Banner "Custom systemd services (*-backend and friends)"
    (Invoke-SSH "systemctl list-units --type=service --all --no-legend --no-pager | grep -Ei 'backend|carlos|aurex|acapital|pms|lms|mms|journal|news|kms|morning|gem' || echo '(none)'") | ForEach-Object { Write-Info $_ }

    Write-Banner "nginx server blocks (sites-enabled)"
    (Invoke-SSH "ls -1 /etc/nginx/sites-enabled/ 2>/dev/null; echo '--- server_name directives ---'; sudo grep -rhE '^\s*server_name' /etc/nginx/sites-enabled/ 2>/dev/null | sort -u") | ForEach-Object { Write-Info $_ }

    Write-Banner "Let's Encrypt certificates"
    (Invoke-SSH "sudo certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains' || echo '(none)'") | ForEach-Object { Write-Info $_ }

    Write-Banner "MongoDB databases"
    (Invoke-SSH "mongosh --quiet --eval 'db.adminCommand({listDatabases:1}).databases.forEach(d=>print(d.name+`t`+d.sizeOnDisk))' 2>/dev/null || mongo --quiet --eval 'db.adminCommand({listDatabases:1}).databases.forEach(function(d){print(d.name)})' 2>/dev/null || echo '(mongo shell not found)'") | ForEach-Object { Write-Info $_ }

    Write-Banner "Disk"
    (Invoke-SSH "df -h / | tail -1") | ForEach-Object { Write-Info $_ }

    Write-Host "`n  Inventory complete. Review the above, then run -Clean -IUnderstand.`n" -ForegroundColor Green
    exit 0
}

# =============================================================================
#  -Clean  (DESTRUCTIVE — removes ALL app artifacts, keeps runtimes)
# =============================================================================
if ($Clean) {
    Write-Warn "DESTRUCTIVE CLEAN of $SERVER — removes every app dir, vhost, cert, custom service, and non-system Mongo DB."
    $c = (Read-Host "  Type the box IP to confirm").Trim()
    if ($c -ne $SERVER) { Write-Fail "IP mismatch. Aborted."; exit 1 }

    Write-Banner "Connecting"
    Invoke-SSH "echo ok" | Out-Null; Write-OK "SSH established"

    Write-Banner "Safety backup of /etc/nginx + unit files + mongo dump (to /opt/_preclean_backup)"
    Invoke-SSH "sudo mkdir -p /opt/_preclean_backup && sudo tar -czf /opt/_preclean_backup/etc-nginx-$(date +%Y%m%d-%H%M%S).tar.gz -C /etc nginx 2>/dev/null; sudo cp -a /etc/systemd/system/*.service /opt/_preclean_backup/ 2>/dev/null; echo done"
    Write-OK "pre-clean backup staged in /opt/_preclean_backup (kept on box)"

    Write-Banner "Stop + disable + remove custom systemd services"
    Invoke-SSH @"
for u in `$(systemctl list-units --type=service --all --no-legend --no-pager | awk '{print `$1}' | grep -Ei 'backend|carlos|aurex|acapital|pms|lms|mms|journal|news|kms|morning'); do
  sudo systemctl stop "`$u" 2>/dev/null; sudo systemctl disable "`$u" 2>/dev/null;
  base=`${u%.service}; sudo rm -f "/etc/systemd/system/`${base}.service" 2>/dev/null;
  echo "removed `$u";
done; sudo systemctl daemon-reload; echo ok
"@ | ForEach-Object { Write-Info $_ }
    Write-OK "custom services removed"

    Write-Banner "Remove nginx server blocks (all)"
    Invoke-SSH "sudo rm -f /etc/nginx/sites-enabled/* /etc/nginx/sites-available/* 2>/dev/null; echo ok"
    Write-OK "nginx vhosts cleared (nginx binary + base config kept)"

    Write-Banner "Delete Let's Encrypt certificates (all)"
    Invoke-SSH "for cn in `$(sudo certbot certificates 2>/dev/null | awk '/Certificate Name:/{print `$3}'); do sudo certbot delete --cert-name `$cn -n 2>/dev/null; echo deleted `$cn; done; echo ok"
    Write-OK "certificates removed"

    Write-Banner "Remove /opt app directories (keep _preclean_backup + lost+found)"
    Invoke-SSH "for d in /opt/*; do b=`$(basename `$d); if [ `"`$b`" != '_preclean_backup' ] && [ `"`$b`" != 'lost+found' ]; then sudo rm -rf `$d; echo removed `$d; fi; done; echo ok"
    Write-OK "/opt cleared"

    Write-Banner "Drop non-system MongoDB databases"
    Invoke-SSH "mongosh --quiet --eval 'db.adminCommand({listDatabases:1}).databases.forEach(function(d){ if([`"admin`",`"config`",`"local`"].indexOf(d.name)===-1){ db.getSiblingDB(d.name).dropDatabase(); print(`"dropped `"+d.name); } })' 2>/dev/null || echo 'check mongo manually'" | ForEach-Object { Write-Info $_ }
    Write-OK "Mongo cleaned to admin/config/local"

    Write-Banner "Reload nginx (validate base config still ok)"
    Invoke-SSH "sudo nginx -t 2>&1 | tail -2; sudo systemctl reload nginx 2>/dev/null || sudo systemctl restart nginx 2>/dev/null; echo ok" | ForEach-Object { Write-Info $_ }
    Write-OK "nginx healthy"

    Write-Host "`n  CLEAN complete. Runtimes preserved. Next: fork the code locally, then -Standup -IUnderstand.`n" -ForegroundColor Green
    exit 0
}

# =============================================================================
#  -Standup  (create the fresh gem2i instance from local forked code)
# =============================================================================
if ($Standup) {
    if (-not (Test-Path (Join-Path $LOCAL "backend")) -or -not (Test-Path (Join-Path $LOCAL "frontend"))) {
        Write-Fail "Local backend/ + frontend/ not found. Fork the code first (Phase 0 strip)."; exit 1
    }
    Write-Warn "STAND UP fresh gem2i instance on $SERVER ($DOMAIN, svc $DEPLOY_SVC, port $DEPLOY_PORT, DB $MONGO_DB)."
    $c = (Read-Host "  Type the box IP to confirm").Trim()
    if ($c -ne $SERVER) { Write-Fail "IP mismatch. Aborted."; exit 1 }

    Write-Banner "Connecting"
    Invoke-SSH "echo ok" | Out-Null; Write-OK "SSH established"

    Write-Banner "Create deploy dir + upload code (tar over ssh, excluding heavy dirs)"
    Invoke-SSH "sudo mkdir -p $DEPLOY_DIR && sudo chown -R ubuntu:ubuntu $DEPLOY_DIR"
    $tar = Join-Path $env:TEMP "gem2i_standup.tar.gz"
    Write-Info "packing local backend/ + frontend/ ..."
    tar --exclude='node_modules' --exclude='venv' --exclude='__pycache__' --exclude='build' --exclude='.git' `
        -czf $tar -C $LOCAL backend frontend
    scp -i $KEY -o StrictHostKeyChecking=no -q $tar "${SSHUSER}@${SERVER}:/tmp/gem2i_standup.tar.gz"
    Invoke-SSH "tar -xzf /tmp/gem2i_standup.tar.gz -C $DEPLOY_DIR && rm /tmp/gem2i_standup.tar.gz"
    Remove-Item $tar -ErrorAction SilentlyContinue
    Write-OK "code uploaded to $DEPLOY_DIR"

    Write-Banner "Python venv + requirements"
    Invoke-SSH "cd $DEPLOY_DIR/backend && python3 -m venv venv && venv/bin/pip install --upgrade pip -q && venv/bin/pip install -r requirements.txt -q 2>&1 | grep -v '^\[notice\]'; echo done" | ForEach-Object { Write-Info $_ }
    Write-OK "venv ready"

    Write-Banner "backend/.env (fresh JWT secret, gem2i DB)"
    Invoke-SSH "cd $DEPLOY_DIR/backend && if [ ! -f .env ]; then printf 'MONGO_URL=mongodb://localhost:27017\nDB_NAME=$MONGO_DB\nJWT_SECRET=%s\nCORS_ORIGINS=$DEPLOY_URL\n' \`openssl rand -hex 32\` > .env; echo created; else echo exists; fi" | ForEach-Object { Write-Info $_ }
    Write-OK "backend/.env in place (never overwritten if present)"

    Write-Banner "frontend/.env + build"
    Invoke-SSH "cd $DEPLOY_DIR/frontend && echo 'REACT_APP_BACKEND_URL=$DEPLOY_URL' > .env && yarn install 2>&1 | grep -v '^warning'; NODE_OPTIONS=--max_old_space_size=2048 yarn build 2>&1 | tail -4" | ForEach-Object { Write-Info $_ }
    Write-OK "frontend built"

    Write-Banner "systemd unit $DEPLOY_SVC"
    $unit = @"
[Unit]
Description=gem2i backend (FastAPI)
After=network.target mongod.service

[Service]
User=ubuntu
WorkingDirectory=$DEPLOY_DIR/backend
ExecStart=$DEPLOY_DIR/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port $DEPLOY_PORT
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
"@
    Invoke-SSH "echo '$($unit -replace "`r","")' | sudo tee /etc/systemd/system/$DEPLOY_SVC.service > /dev/null && sudo systemctl daemon-reload && sudo systemctl enable --now $DEPLOY_SVC && sleep 4 && systemctl is-active $DEPLOY_SVC" | ForEach-Object { Write-Info $_ }
    Write-OK "$DEPLOY_SVC active"

    Write-Banner "nginx vhost for $DOMAIN (HTTP first; certbot adds TLS)"
    Write-Info "NOTE: the vhost file is written from scripts/gem2i_nginx.conf via scp (never inline in PowerShell -- avoids \$host expansion)."
    $nginxLocal = Join-Path $LOCAL "scripts\gem2i_nginx.conf"
    if (-not (Test-Path $nginxLocal)) { Write-Fail "Missing scripts/gem2i_nginx.conf (created during Phase 0)."; exit 1 }
    scp -i $KEY -o StrictHostKeyChecking=no -q $nginxLocal "${SSHUSER}@${SERVER}:/tmp/gem2i_nginx.conf"
    Invoke-SSH "sudo mv /tmp/gem2i_nginx.conf /etc/nginx/sites-available/$DOMAIN && sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN && sudo nginx -t && sudo systemctl reload nginx" | ForEach-Object { Write-Info $_ }
    Write-OK "vhost enabled"

    Write-Banner "Let's Encrypt cert for $DOMAIN"
    Invoke-SSH "sudo certbot --nginx -d $DOMAIN -n --agree-tos -m admin@gem2i.com --redirect 2>&1 | tail -4" | ForEach-Object { Write-Info $_ }
    Write-OK "TLS issued"

    Write-Banner "Health check"
    $code = (Invoke-SSH "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${DEPLOY_PORT}/api/health").Trim()
    if ($code -ne "200") { throw "Health check failed: HTTP $code" }
    Write-OK "$DEPLOY_URL -> HTTP $code"

    Write-Host "`n  STAND-UP complete. $DEPLOY_URL is live. Use deploy_beta_gem2i.ps1 for ongoing deploys.`n" -ForegroundColor Green
    exit 0
}
