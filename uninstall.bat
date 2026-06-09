@echo off
:: This batch file bypasses Windows script restrictions and runs the PowerShell uninstall script.
:: You can just double-click this file to uninstall everything!

echo Starting Instagram Checker Uninstall...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"
if %errorlevel% neq 0 (
    echo.
    echo Uninstall failed or was cancelled.
    pause
)
