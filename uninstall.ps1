# Instagram Checker - Windows Uninstall Script
# Run this script via uninstall.bat or as Administrator in PowerShell

$ErrorActionPreference = "Stop"

# == Step 1: Check for Administrator privileges & Auto-Elevate ==================
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    # Relaunch script as Administrator with execution policy bypass
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

try {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "  Instagram Checker - Uninstall Script" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    Write-Host ""

    # == Step 2: Stop and remove the app from PM2 ===============================
    Write-Host "[1/4] Stopping PM2 processes..." -ForegroundColor Green
    if (Get-Command pm2 -ErrorAction SilentlyContinue) {
        pm2 stop instagram-checker 2>$null
        pm2 delete instagram-checker 2>$null
        pm2 save --force
        Write-Host "  [OK] PM2 processes stopped and deleted." -ForegroundColor Gray
    } else {
        Write-Host "  PM2 not found, skipping." -ForegroundColor Gray
    }

    # == Step 3: Remove the auto-start task ======================================
    Write-Host ""
    Write-Host "[2/4] Removing startup task from Task Scheduler..." -ForegroundColor Green
    $taskExists = Get-ScheduledTask -TaskName "InstagramCheckerStartup" -ErrorAction SilentlyContinue
    if ($taskExists) {
        Unregister-ScheduledTask -TaskName "InstagramCheckerStartup" -Confirm:$false
        Write-Host "  [OK] Startup task unregistered." -ForegroundColor Gray
    } else {
        Write-Host "  Startup task not found, skipping." -ForegroundColor Gray
    }

    # == Step 4: Uninstall PM2 ===================================================
    Write-Host ""
    Write-Host "[3/4] Uninstalling PM2..." -ForegroundColor Green
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        npm uninstall -g pm2
        Write-Host "  [OK] PM2 uninstalled." -ForegroundColor Gray
    } else {
        Write-Host "  npm not found, skipping PM2 uninstall." -ForegroundColor Gray
    }

    # == Done ==================================================================
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "  Uninstall complete!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  You can now close this window and delete" -ForegroundColor White
    Write-Host "  the 'insta-checker' project folder." -ForegroundColor White
    Write-Host "======================================" -ForegroundColor Red
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: Uninstall failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
} finally {
    Write-Host ""
    Read-Host "Press Enter to exit..."
}
