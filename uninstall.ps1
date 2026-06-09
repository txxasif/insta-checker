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

    # == Step 2: Stop background Node.js server =================================
    Write-Host "[1/4] Stopping background server..." -ForegroundColor Green
    
    # Forcefully close any running node.exe servers (ignore error if not running)
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    taskkill /f /im node.exe > $null 2>&1
    $ErrorActionPreference = $oldPreference
    
    # Also clean up PM2 if it's still running from previous attempts
    if (Get-Command pm2 -ErrorAction SilentlyContinue) {
        $oldPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        pm2 stop instagram-checker > $null 2>&1
        pm2 delete instagram-checker > $null 2>&1
        pm2 save --force > $null 2>&1
        pm2 kill > $null 2>&1
        $ErrorActionPreference = $oldPreference
    }
    
    Write-Host "  [OK] Background servers stopped." -ForegroundColor Gray

    # == Step 3: Remove from startup ============================================
    Write-Host ""
    Write-Host "[2/4] Removing app from Windows startup..." -ForegroundColor Green
    
    # Remove startup shortcut
    $startupShortcut = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\InstagramChecker.lnk"
    if (Test-Path $startupShortcut) {
        Remove-Item $startupShortcut -Force
        Write-Host "  [OK] Startup shortcut removed." -ForegroundColor Gray
    } else {
        Write-Host "  Startup shortcut not found, skipping." -ForegroundColor Gray
    }
    
    # Remove task scheduler task if it exists from previous setup versions
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    $taskExists = Get-ScheduledTask -TaskName "InstagramCheckerStartup"
    if ($taskExists) {
        Unregister-ScheduledTask -TaskName "InstagramCheckerStartup" -Confirm:$false
        Write-Host "  [OK] Legacy startup task unregistered." -ForegroundColor Gray
    }
    $ErrorActionPreference = $oldPreference

    # == Step 4: Delete generated script files ==================================
    Write-Host ""
    Write-Host "[3/4] Deleting generated background scripts..." -ForegroundColor Green
    
    $vbsScript = "$PSScriptRoot\start.vbs"
    if (Test-Path $vbsScript) {
        Remove-Item $vbsScript -Force
        Write-Host "  [OK] start.vbs script deleted." -ForegroundColor Gray
    }

    # == Step 5: Uninstall PM2 (Clean up) =======================================
    Write-Host ""
    Write-Host "[4/4] Uninstalling PM2 (if installed)..." -ForegroundColor Green
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        npm uninstall -g pm2 > $null 2>&1
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
