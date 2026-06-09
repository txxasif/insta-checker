@echo off
:: This batch file bypasses Windows script restrictions and runs the PowerShell setup script.
:: You can just double-click this file to start the setup!

echo Starting Instagram Checker Setup...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
if %errorlevel% neq 0 (
    echo.
    echo Setup failed or was cancelled.
    pause
)
