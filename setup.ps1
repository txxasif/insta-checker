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

    # == Step 5: Clean up old PM2/Task Scheduler tasks if they exist ===========
    Write-Host ""
    Write-Host "[4/5] Cleaning up old startup configurations..." -ForegroundColor Green
    
    # Unregister old task scheduler task if it exists
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    $taskExists = Get-ScheduledTask -TaskName "InstagramCheckerStartup"
    if ($taskExists) {
        Unregister-ScheduledTask -TaskName "InstagramCheckerStartup" -Confirm:$false
    }
    # Stop and delete old PM2 app and PM2 service if installed
    if (Get-Command pm2 -ErrorAction SilentlyContinue) {
        pm2 stop instagram-checker > $null 2>&1
        pm2 delete instagram-checker > $null 2>&1
        pm2 save --force > $null 2>&1
        pm2 kill > $null 2>&1
    }
    $ErrorActionPreference = $oldPreference
    Write-Host "  Clean up complete." -ForegroundColor Gray

    # == Step 6: Create VBScript and Startup Shortcut ===========================
    Write-Host ""
    Write-Host "[5/5] Configuring background auto-start..." -ForegroundColor Green

    # Create the start.vbs script in the project directory
    $vbsContent = @"
Set objFSO = CreateObject("Scripting.FileSystemObject")
strPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = strPath
WshShell.Run "node node_modules\next\dist\bin\next start", 0, False
"@
    $vbsContent | Out-File -FilePath "$PSScriptRoot\start.vbs" -Encoding ascii

    # Create shortcut in the Windows Startup folder
    $startupPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$startupPath\InstagramChecker.lnk")
    $Shortcut.TargetPath = "$PSScriptRoot\start.vbs"
    $Shortcut.WorkingDirectory = $PSScriptRoot
    $Shortcut.Save()

    # Kill any existing Next.js servers to avoid port conflicts (ignore error if not running)
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    taskkill /f /im node.exe > $null 2>&1
    $ErrorActionPreference = $oldPreference

    # Start the app immediately in the background using the VBScript
    Write-Host "  Starting the application in the background..." -ForegroundColor Yellow
    wscript.exe "$PSScriptRoot\start.vbs"

    Write-Host "  [OK] Background startup configured." -ForegroundColor Gray
    Write-Host "  App is running in the background and will start automatically on Windows boot." -ForegroundColor Gray

    # == Done ==================================================================
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "  Setup complete!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Open your browser and go to:" -ForegroundColor White
    Write-Host "  http://localhost:3000" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  The app is running completely hidden" -ForegroundColor White
    Write-Host "  in the background." -ForegroundColor White
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
