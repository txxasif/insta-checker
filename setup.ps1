# Instagram Checker - Windows Setup Script
# Run this script in PowerShell as Administrator

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Instagram Checker - Setup Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Check for Administrator privileges ─────────────────────────────────
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run this script as Administrator." -ForegroundColor Red
    Write-Host "Right-click PowerShell and choose 'Run as Administrator', then try again." -ForegroundColor Yellow
    exit 1
}

# ── Step 2: Install Node.js ────────────────────────────────────────────────────
Write-Host "[1/5] Checking for Node.js..." -ForegroundColor Green

$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if ($nodeInstalled) {
    Write-Host "  Node.js is already installed: $(node --version)" -ForegroundColor Gray
} else {
    Write-Host "  Node.js not found. Installing via winget..." -ForegroundColor Yellow
    winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements -e
    # Refresh PATH so node/npm are available in this session
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-Host "  Node.js $(node --version) installed." -ForegroundColor Gray
}

# ── Step 3: Install project packages ──────────────────────────────────────────
Write-Host ""
Write-Host "[2/5] Installing project packages..." -ForegroundColor Green

Set-Location $PSScriptRoot
npm install

Write-Host "  Packages installed." -ForegroundColor Gray

# ── Step 4: Build the app ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/5] Building the app (this may take a minute)..." -ForegroundColor Green

npm run build

Write-Host "  Build complete." -ForegroundColor Gray

# ── Step 5: Install PM2 ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/5] Installing PM2..." -ForegroundColor Green

npm install -g pm2

Write-Host "  PM2 installed." -ForegroundColor Gray

# ── Step 6: Start the app and configure auto-start ────────────────────────────
Write-Host ""
Write-Host "[5/5] Starting the app and setting up auto-start on boot..." -ForegroundColor Green

# Remove old process if it exists
pm2 delete instagram-checker 2>$null

# Start the app
pm2 start npm --name "instagram-checker" -- run start

# Save the process list
pm2 save

# Set up startup — on Windows this creates a Task Scheduler entry
pm2 startup

Write-Host "  App is running and will start automatically on boot." -ForegroundColor Gray

# ── Done ──────────────────────────────────────────────────────────────────────
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
