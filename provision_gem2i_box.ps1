# =============================================================================
#  provision_gem2i_box.ps1  --  ONE-TIME box lifecycle for the gem2i instance
#
#  Thin wrapper: uploads the matching scripts/box_*.sh to the box and runs it.
#  All server logic lives in the .sh files (kept out of PowerShell so PS 5.1
#  never mis-parses embedded bash — the earlier inline-heredoc version did).
#
#  MODES (pick exactly one):
#    -Inventory                 SAFE, read-only report (scripts/box_inventory.sh)
#    -Clean      -IUnderstand    DESTRUCTIVE wipe, keeps runtimes (box_clean.sh)
#    -Standup    -IUnderstand    Build the fresh instance from local code (box_standup.sh)
#
#  SAFETY: hardcoded to 34.198.159.54; refuses the three brand IPs; destructive
#  modes require -IUnderstand and the IP typed back.
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

$KEY     = "C:\2026\Acapitalgroup.com_Emergent_Claude\Instancias-Keys-SSH\Gem2i-LightsailDefaultKey-us-east-1.pem"
if (-not (Test-Path $KEY)) {
    if ($env:GEM2I_SSH_KEY -and (Test-Path $env:GEM2I_SSH_KEY)) { $KEY = $env:GEM2I_SSH_KEY }
    elseif (Test-Path "$HOME\.ssh\id_ed25519") { $KEY = "$HOME\.ssh\id_ed25519" }
}
$SERVER  = "34.198.159.54"
$SSHUSER = "ubuntu"
$LOCAL   = $PSScriptRoot
$FORBIDDEN = @("34.238.109.173", "18.232.233.16", "52.55.141.150")

function Fail($m) { Write-Host "  XX  $m" -ForegroundColor Red; exit 1 }
function Info($m) { Write-Host "  ->  $m" -ForegroundColor Gray }

# --- guards ---
if ($FORBIDDEN -contains $SERVER) { Fail "SERVER is a brand box. ABORT." }
$modeCount = @($Inventory, $Clean, $Standup | Where-Object { $_ }).Count
if ($modeCount -ne 1) { Fail "Pick exactly one mode: -Inventory | -Clean | -Standup" }
if (-not (Test-Path $KEY)) { Fail "SSH key not found: $KEY" }
if (($Clean -or $Standup) -and -not $IUnderstand) { Fail "Destructive mode requires -IUnderstand. Run -Inventory first." }

$sshBase = @("-i", $KEY, "-o", "StrictHostKeyChecking=no", "-o", "BatchMode=yes", "-o", "ConnectTimeout=25")
function Run-Remote($localSh) {
    $name = Split-Path $localSh -Leaf
    Info "uploading $name"
    scp @sshBase -q $localSh "${SSHUSER}@${SERVER}:/tmp/$name"
    if ($LASTEXITCODE -ne 0) { Fail "upload failed: $name" }
    # strip CRLF then run
    ssh @sshBase "${SSHUSER}@${SERVER}" "sed -i 's/\r`$//' /tmp/$name && bash /tmp/$name"
    if ($LASTEXITCODE -ne 0) { Fail "$name exited non-zero" }
}

Write-Host ""
Write-Host "  ========================================================" -ForegroundColor White
Write-Host "   gem2i box provisioning  --  $SERVER" -ForegroundColor White
Write-Host "  ========================================================" -ForegroundColor White

if ($Inventory) {
    Run-Remote (Join-Path $LOCAL "scripts\box_inventory.sh")
    exit 0
}

if ($Clean) {
    Write-Host "  DESTRUCTIVE CLEAN of $SERVER (keeps runtimes)." -ForegroundColor Yellow
    $c = (Read-Host "  Type the box IP to confirm").Trim()
    if ($c -ne $SERVER) { Fail "IP mismatch. Aborted." }
    Run-Remote (Join-Path $LOCAL "scripts\box_clean.sh")
    Write-Host "  CLEAN complete. Next: fork/strip locally, then -Standup -IUnderstand.`n" -ForegroundColor Green
    exit 0
}

if ($Standup) {
    if (-not (Test-Path (Join-Path $LOCAL "backend")) -or -not (Test-Path (Join-Path $LOCAL "frontend"))) {
        Fail "Local backend/ + frontend/ not found. Fork the code first."
    }
    Write-Host "  STAND UP fresh gem2i instance on $SERVER (beta.gem2i.com)." -ForegroundColor Yellow
    $c = (Read-Host "  Type the box IP to confirm").Trim()
    if ($c -ne $SERVER) { Fail "IP mismatch. Aborted." }

    # 1) upload code (tar over ssh, excluding heavy dirs)
    Info "packing + uploading code"
    $tar = Join-Path $env:TEMP "gem2i_code.tar.gz"
    tar --exclude='node_modules' --exclude='venv' --exclude='__pycache__' --exclude='build' --exclude='.git' --exclude='*.pyc' `
        -czf $tar -C $LOCAL backend frontend
    ssh @sshBase "${SSHUSER}@${SERVER}" "sudo mkdir -p /opt/beta.gem2i.com && sudo chown -R ubuntu:ubuntu /opt/beta.gem2i.com"
    scp @sshBase -q $tar "${SSHUSER}@${SERVER}:/tmp/gem2i_code.tar.gz"
    scp @sshBase -q (Join-Path $LOCAL "scripts\gem2i_nginx.conf") "${SSHUSER}@${SERVER}:/tmp/gem2i_nginx.conf"
    ssh @sshBase "${SSHUSER}@${SERVER}" "tar -xzf /tmp/gem2i_code.tar.gz -C /opt/beta.gem2i.com && rm /tmp/gem2i_code.tar.gz"
    Remove-Item $tar -ErrorAction SilentlyContinue

    # 2) run the standup
    Run-Remote (Join-Path $LOCAL "scripts\box_standup.sh")
    Write-Host "  STAND-UP complete. Use deploy_beta_gem2i.ps1 for ongoing deploys.`n" -ForegroundColor Green
    exit 0
}
