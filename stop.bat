@echo off
:: This batch file stops the background Instagram Checker server.
:: Double-click this file to stop the application from running!

echo Stopping Instagram Checker background server...
taskkill /f /im node.exe
echo.
echo Server has been stopped successfully.
pause
