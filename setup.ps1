# Instagram Checker - Windows Setup Script
# Run this script via setup.bat or as Administrator in PowerShell

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
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "  Instagram Checker - Setup Script" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""

    # == Step 2: Install Node.js ================================================
    Write-Host "[1/5] Checking for Node.js..." -ForegroundColor Green

    $nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeInstalled) {
        Write-Host "  Node.js is already installed: $(node --version)" -ForegroundColor Gray
    } else {
        Write-Host "  Node.js not found. Installing via winget..." -ForegroundColor Yellow
        winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements -e
        
        # Refresh PATH in the current session so node/npm commands work immediately
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
            throw "Node.js installation completed, but 'node' command is not yet available in this terminal session. Please restart your computer and run this script again."
        }
        Write-Host "  Node.js $(node --version) installed successfully." -ForegroundColor Gray
    }

    # == Step 3: Install project packages ======================================
    Write-Host ""
    Write-Host "[2/5] Installing project packages..." -ForegroundColor Green

    Set-Location $PSScriptRoot
    npm install

    Write-Host "  Packages installed successfully." -ForegroundColor Gray

    # == Step 4: Build the app =================================================
    Write-Host ""
    Write-Host "[3/5] Building the app (this may take a minute)..." -ForegroundColor Green

    npm run build

    Write-Host "  Build complete." -ForegroundColor Gray

    # == Step 5: Install PM2 ===================================================
    Write-Host ""
    Write-Host "[4/5] Installing PM2..." -ForegroundColor Green

    npm install -g pm2

    Write-Host "  PM2 installed successfully." -ForegroundColor Gray

    # == Step 6: Start the app and configure auto-start ========================
    Write-Host ""
    Write-Host "[5/5] Starting the app and setting up auto-start..." -ForegroundColor Green

    # Remove old process if it exists (ignore error if it doesn't exist)
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    pm2 delete instagram-checker > $null 2>&1
    $ErrorActionPreference = $oldPreference

    # Start the app
    pm2 start "$PSScriptRoot\node_modules\next\dist\bin\next" --name "instagram-checker" -- start

    # Save the current PM2 state
    pm2 save

    # Set up Task Scheduler task to run 'pm2 resurrect' on Windows logon/boot
    Write-Host "  Registering Windows Task Scheduler startup task..." -ForegroundColor Yellow
    
    $action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c pm2 resurrect"
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive
    
    Register-ScheduledTask -TaskName "InstagramCheckerStartup" -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null

    Write-Host "  [OK] Startup task registered successfully." -ForegroundColor Gray
    Write-Host "  App is running and will start automatically on boot/logon." -ForegroundColor Gray

    # == Done ==================================================================
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "  Setup complete!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Open your browser and go to:" -ForegroundColor White
    Write-Host "  http://localhost:3000" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  The app will start automatically" -ForegroundColor White
    Write-Host "  every time Windows starts." -ForegroundColor White
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: Setup failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
} finally {
    Write-Host ""
    Read-Host "Press Enter to exit..."
}
