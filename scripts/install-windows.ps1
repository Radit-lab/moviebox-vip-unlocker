# MovieBox VIP Unlocker - one-click installer for Windows (Chrome / Edge / Brave)
# Run this ONCE: open PowerShell, paste the one-liner below, done.
#
#   Invoke-Expression (Invoke-RestMethod 'https://raw.githubusercontent.com/Radit-lab/moviebox-vip-unlocker/main/scripts/install-windows.ps1')
#
# What it does:
#   1. Downloads the latest release zip
#   2. Extracts it to %APPDATA%\moviebox-vip-unlocker
#   3. Opens the extensions page with Developer mode
#   4. You finish in 10 seconds: toggle Developer mode on, click "Load
#      unpacked", pick the folder shown at the end. That's it.

$ErrorActionPreference = 'Stop'

$InstallDir = Join-Path $env:APPDATA 'moviebox-vip-unlocker'
$ZipPath    = Join-Path $env:TEMP 'moviebox-vip-unlocker-latest.zip'
$ReleaseUrl = 'https://github.com/Radit-lab/moviebox-vip-unlocker/releases/latest/download/moviebox-vip-unlocker.zip'

Write-Host 'Downloading MovieBox VIP Unlocker...' -ForegroundColor Cyan
Invoke-RestMethod -Uri $ReleaseUrl -OutFile $ZipPath

Write-Host 'Extracting...' -ForegroundColor Cyan
if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }
Expand-Archive -LiteralPath $ZipPath -DestinationPath $InstallDir -Force
Remove-Item $ZipPath -Force

$Unpacked = Join-Path $InstallDir 'moviebox-vip-unlocker'
if (-not (Test-Path $Unpacked)) { $Unpacked = $InstallDir }

Write-Host 'Done. The extension folder is:' -ForegroundColor Green
Write-Host $Unpacked -ForegroundColor White
Write-Host ''
Write-Host 'Last 2 steps (Chrome/Edge/Brave):' -ForegroundColor Cyan
Write-Host ' 1. In the extensions page that just opened, toggle "Developer mode" ON (top-right)'
Write-Host ' 2. Click "Load unpacked" and pick the folder printed above'
Write-Host ''
Write-Host 'Then open MovieBox and hit play - the unlock is automatic.' -ForegroundColor Green

Start-Process 'chrome://extensions'
Start-Sleep -Seconds 2
Start-Process 'edge://extensions'
Set-Clipboard -Value $Unpacked
Write-Host '(The folder path was copied to your clipboard.)'
