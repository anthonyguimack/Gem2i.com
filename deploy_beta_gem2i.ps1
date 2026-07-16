# =============================================================================
#  deploy_beta_gem2i.ps1  --  beta.gem2i.com  Smart Deploy
#
#  Detects ALL changes since the last deployment (git diff since stamp +
#  uncommitted working-tree changes), uploads them, rebuilds only what changed,
#  restarts the backend, health-checks, and rolls back on failure.
#
#  Usage:
#    .\deploy_beta_gem2i.ps1        (interactive confirm)
#    .\deploy_beta_gem2i.ps1 -y     (non-interactive / automation)
#
#  This is the ONGOING deploy. The one-time box clean + first stand-up is done
#  by provision_gem2i_box.ps1 (which uploads the full tree the first time).
#
#  ISOLATED product: standalone, no chained sub-products. Touches ONLY the
#  gem2i box (34.198.159.54). NEVER carlos/aurex/acapital.
#
#  NEVER touches: backend/.env | frontend/.env | backend/uploads/ | MongoDB | Nginx | SSL
# =============================================================================

Set-StrictMode -Version 1
$ErrorActionPreference = "Stop"

$autoYes = ($args -contains '-y') -or ($args -contains '--yes') -or ($env:DEPLOY_YES -eq '1')

# --- CONFIGURATION -----------------------------------------------------------

$KEY      = "C:\2026\Acapitalgroup.com_Emergent_Claude\Instancias-Keys-SSH\Gem2i-LightsailDefaultKey-us-east-1.pem"
if (-not (Test-Path $KEY)) {
    if ($env:GEM2I_SSH_KEY -and (Test-Path $env:GEM2I_SSH_KEY)) { $KEY = $env:GEM2I_SSH_KEY }
    elseif (Test-Path "$HOME\.ssh\id_ed25519") { $KEY = "$HOME\.ssh\id_ed25519" }
}
$SERVER   = "34.198.159.54"
$SSHUSER  = "ubuntu"
$LOCAL    = $PSScriptRoot

$DEPLOY_DIR  = "/opt/beta.gem2i.com"
$DEPLOY_SVC  = "gem2i-backend"
$DEPLOY_PORT = "8050"
$DEPLOY_URL  = "https://beta.gem2i.com"

$STAMP_FILE  = Join-Path $LOCAL ".last-deploy-gem2i"
$BACKUP_SLUG = "beta.gem2i.com"

# --- EXCLUSION LIST ----------------------------------------------------------
$EXCLUDED_PATTERNS = @(
    '^backend/\.env$'
    '^frontend/\.env'
    '^backend/uploads/'
    '^frontend/node_modules/'
    '^frontend/build/'
    '^backend/venv/'
    '^backend/__pycache__/'
    '\.pyc$'
    '^\.git/'
    '\.ps1$'
    '^\.last-deploy-gem2i$'
    '^memory/'
    '^work-plans-MD/'
    '^reference/'
    '^scripts/'
    '^\.claude/'
    '^__bases_de_datos/'
    '\.tar\.gz'
    '\.pem$'
    '^CLAUDE\.md$'
    '^CLAUDE\.backup\.md'
)

# =============================================================================
#  HELPERS
# =============================================================================
function Write-Banner { param($m) Write-Host "`n  -- $m" -ForegroundColor Cyan }
function Write-OK     { param($m) Write-Host "     OK  $m" -ForegroundColor Green }
function Write-Warn   { param($m) Write-Host "     >>  $m" -ForegroundColor Yellow }
function Write-Info   { param($m) Write-Host "     ->  $m" -ForegroundColor Gray }
function Write-Fail   { param($m) Write-Host "     XX  $m" -ForegroundColor Red }

function Invoke-SSH {
    param([string]$Cmd, [switch]$AllowFail)
    $out = ssh -n -i $KEY -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=20 `
               "${SSHUSER}@${SERVER}" $Cmd 2>$null
    if (-not $AllowFail -and $LASTEXITCODE -ne 0) {
        throw "SSH command failed (exit $LASTEXITCODE)`nCmd : $Cmd`nOut : $($out -join ' ')"
    }
    return $out
}
function Invoke-SCP {
    param([string]$LocalFile, [string]$RemotePath)
    scp -i $KEY -o StrictHostKeyChecking=no -o BatchMode=yes -q $LocalFile "${SSHUSER}@${SERVER}:${RemotePath}" 2>$null
    if ($LASTEXITCODE -ne 0) { throw "Upload failed: $LocalFile -> $RemotePath" }
}
function Test-IsExcluded {
    param([string]$Path)
    $p = $Path -replace '\\', '/'
    foreach ($pat in $EXCLUDED_PATTERNS) { if ($p -match $pat) { return $true } }
    return $false
}
function Get-ChangedFiles {
    $upload = [System.Collections.Generic.List[string]]::new()
    $delete = [System.Collections.Generic.List[string]]::new()
    $lastHash = if (Test-Path $STAMP_FILE) { (Get-Content $STAMP_FILE -Raw).Trim() } else { $null }
    $currHash = (git -C $LOCAL rev-parse HEAD 2>$null) -join '' | ForEach-Object { $_.Trim() }
    if ($lastHash -and $lastHash -ne $currHash) {
        $diffLines = git -C $LOCAL diff "${lastHash}..${currHash}" --name-status 2>$null
        foreach ($line in $diffLines) {
            if (-not $line.Trim()) { continue }
            if ($line -match '^R\d*\s+(\S+)\s+(\S+)$') { $delete.Add($Matches[1]); $upload.Add($Matches[2]) }
            elseif ($line -match '^D\s+(.+)$') { $delete.Add($Matches[1].Trim()) }
            elseif ($line -match '^[ACMT]\s+(.+)$') { $upload.Add($Matches[1].Trim()) }
        }
    }
    $statusLines = git -C $LOCAL status --porcelain 2>$null
    foreach ($line in $statusLines) {
        if (-not $line.Trim()) { continue }
        $xy = $line.Substring(0, 2); $file = $line.Substring(3).Trim()
        if ($file -match '^(.+) -> (.+)$') {
            $oldFile = $Matches[1].Trim(); $file = $Matches[2].Trim()
            if (-not $delete.Contains($oldFile)) { $delete.Add($oldFile) }
        }
        if ($xy -match 'D') { if (-not $delete.Contains($file)) { $delete.Add($file) } }
        elseif ($file.EndsWith('/')) {
            # git status collapses untracked directories into "dir/" — expand to
            # individual files (scp can't upload a directory without -r).
            $dirFull = Join-Path $LOCAL ($file -replace '/', '\')
            if (Test-Path $dirFull) {
                Get-ChildItem $dirFull -Recurse -File | ForEach-Object {
                    $rel = $_.FullName.Substring($LOCAL.Length + 1) -replace '\\', '/'
                    if (-not $upload.Contains($rel)) { $upload.Add($rel) }
                }
            }
        }
        else { if (-not $upload.Contains($file)) { $upload.Add($file) } }
    }
    return @{
        Upload = @( $upload | Where-Object { $_ -and -not (Test-IsExcluded $_) } | Sort-Object -Unique )
        Delete = @( $delete | Where-Object { $_ -and -not (Test-IsExcluded $_) } | Sort-Object -Unique )
    }
}
function Invoke-Rollback {
    param([string]$BackupPath)
    if (-not $BackupPath) { return }
    Write-Host "`n  ROLLING BACK to last known good state..." -ForegroundColor Yellow
    try {
        Invoke-SSH "sudo tar -xzf $BackupPath -C /opt/ 2>/dev/null && sudo systemctl restart $DEPLOY_SVC"
        Write-OK "Restored from: $BackupPath"
    } catch { Write-Warn "Could not restore from backup: $_" }
}

# =============================================================================
#  MAIN
# =============================================================================
Clear-Host
Write-Host ""
Write-Host "  ==========================================================" -ForegroundColor White
Write-Host "   beta.gem2i.com  --  Smart Deploy (isolated product)" -ForegroundColor White
Write-Host "   $(Get-Date -Format 'yyyy-MM-dd  HH:mm:ss')" -ForegroundColor Gray
Write-Host "  ==========================================================" -ForegroundColor White
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Write-Fail "git not found."; exit 1 }
if (-not (Test-Path (Join-Path $LOCAL ".git"))) { Write-Fail "Not a git repository: $LOCAL"; exit 1 }
if (-not (Test-Path $KEY)) { Write-Fail "SSH key not found: $KEY"; exit 1 }

Write-Host "  Scanning for changes..." -ForegroundColor Gray
$changes = Get-ChangedFiles
if ($changes.Upload.Count -eq 0 -and $changes.Delete.Count -eq 0) {
    Write-Warn "Nothing to deploy -- no changes since last deployment."
    exit 0
}
Write-Host ""
if ($changes.Upload.Count -gt 0) {
    Write-Host "  TO UPLOAD  ($($changes.Upload.Count) files)" -ForegroundColor White
    foreach ($f in $changes.Upload) { Write-Host "    +  $f" -ForegroundColor Green }
}
if ($changes.Delete.Count -gt 0) {
    Write-Host "`n  TO DELETE ON SERVER  ($($changes.Delete.Count) files)" -ForegroundColor White
    foreach ($f in $changes.Delete) { Write-Host "    -  $f" -ForegroundColor Red }
}

$needsFrontendBuild = ($changes.Upload | Where-Object { $_ -match '^frontend/src/' }).Count -gt 0
$needsPipInstall    = ($changes.Upload | Where-Object { $_ -match 'requirements\.txt$' }).Count -gt 0
$needsYarnInstall   = ($changes.Upload | Where-Object { $_ -match 'frontend/package\.json$' }).Count -gt 0

Write-Host "`n  TARGET:  $DEPLOY_URL" -ForegroundColor Cyan
Write-Host "  SERVER:  $SERVER  ->  $DEPLOY_DIR" -ForegroundColor Cyan
Write-Host ""
if ($autoYes) { Write-Info "Auto-confirmed (non-interactive mode)" }
else {
    $confirm = (Read-Host "  Deploy to beta.gem2i.com? (y/n)").ToLower().Trim()
    if ($confirm -ne "y" -and $confirm -ne "yes") { Write-Host "`n  Cancelled.`n"; exit 0 }
}

$backupPath = $null
$startTime  = Get-Date
try {
    Write-Banner "Connecting to $SERVER"
    Invoke-SSH "echo ok" | Out-Null
    Write-OK "SSH connection established"

    Write-Banner "Backup"
    $ts = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupPath = "/opt/${BACKUP_SLUG}-backup-${ts}.tar.gz"
    Invoke-SSH "sudo tar --exclude='*/node_modules' --exclude='*/venv' --exclude='*/__pycache__' -czf $backupPath -C /opt $BACKUP_SLUG"
    Write-OK "$backupPath"

    Write-Banner "Ownership"
    Invoke-SSH "sudo chown -R ubuntu:ubuntu $DEPLOY_DIR/frontend"
    Write-OK "$DEPLOY_DIR/frontend -> ubuntu:ubuntu"

    Write-Banner "Frontend .env"
    Invoke-SSH "touch $DEPLOY_DIR/frontend/.env; if grep -q 'REACT_APP_BACKEND_URL' $DEPLOY_DIR/frontend/.env; then sed -i 's|REACT_APP_BACKEND_URL=.*|REACT_APP_BACKEND_URL=$DEPLOY_URL|' $DEPLOY_DIR/frontend/.env; else echo 'REACT_APP_BACKEND_URL=$DEPLOY_URL' >> $DEPLOY_DIR/frontend/.env; fi"
    Write-OK "REACT_APP_BACKEND_URL=$DEPLOY_URL"

    if ($changes.Upload.Count -gt 0) {
        Write-Banner "Uploading $($changes.Upload.Count) file(s)"
        foreach ($f in $changes.Upload) {
            $localFile  = Join-Path $LOCAL ($f -replace '/', '\')
            $remotePath = "$DEPLOY_DIR/$f"
            $remoteDir  = $remotePath -replace '/[^/]+$', ''
            Invoke-SSH "mkdir -p $remoteDir"
            Invoke-SCP $localFile $remotePath
            Write-OK $f
        }
    }
    if ($changes.Delete.Count -gt 0) {
        Write-Banner "Removing $($changes.Delete.Count) deleted file(s)"
        foreach ($f in $changes.Delete) { Invoke-SSH "rm -f $DEPLOY_DIR/$f" -AllowFail; Write-OK "Removed: $f" }
    }
    if ($needsPipInstall) {
        Write-Banner "pip install (requirements.txt changed)"
        Invoke-SSH "$DEPLOY_DIR/backend/venv/bin/pip install -r $DEPLOY_DIR/backend/requirements.txt -q 2>&1 | grep -v '^\[notice\]'; exit `${PIPESTATUS[0]}"
        Write-OK "pip install complete"
    }
    if ($needsYarnInstall) {
        Write-Banner "yarn install (package.json changed)"
        Invoke-SSH "cd $DEPLOY_DIR/frontend && yarn install 2>&1 | grep -v '^warning'; exit 0" -AllowFail
        Write-OK "yarn install complete"
    }
    if ($needsFrontendBuild) {
        Write-Banner "Building frontend (~2 min)"
        $buildOut = Invoke-SSH "cd $DEPLOY_DIR/frontend && NODE_OPTIONS=--max_old_space_size=2048 yarn build 2>&1 | tail -5"
        $buildOut -split "`n" | Where-Object { $_.Trim() } | ForEach-Object { Write-Info $_.Trim() }
        Write-OK "Frontend built"
    } else {
        Write-Banner "Frontend build"; Write-Info "Skipped -- no frontend/src/ files changed"
    }

    Write-Banner "Restarting $DEPLOY_SVC"
    Invoke-SSH "sudo systemctl restart $DEPLOY_SVC"
    Start-Sleep -Seconds 5
    $status = (Invoke-SSH "systemctl is-active $DEPLOY_SVC").Trim()
    if ($status -ne "active") { throw "Backend not running after restart (status: $status)" }
    Write-OK "$DEPLOY_SVC -> $status"

    Write-Banner "Health check"
    $code = (Invoke-SSH "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${DEPLOY_PORT}/api/health").Trim()
    if ($code -ne "200") { throw "API health check failed: HTTP $code (expected 200)" }
    Write-OK "$DEPLOY_URL -> HTTP $code"

    $currHash = (git -C $LOCAL rev-parse HEAD 2>$null) -join '' | ForEach-Object { $_.Trim() }
    Set-Content -Path $STAMP_FILE -Value $currHash -NoNewline

    $elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds)
    Write-Host "`n  ==========================================================" -ForegroundColor Green
    Write-Host "   Deployment complete in $([math]::Floor($elapsed/60))m $($elapsed%60)s" -ForegroundColor Green
    Write-Host "   $DEPLOY_URL" -ForegroundColor Green
    Write-Host "  ==========================================================`n" -ForegroundColor Green
} catch {
    Write-Fail "Deployment failed: $_"
    Invoke-Rollback $backupPath
    exit 1
}
