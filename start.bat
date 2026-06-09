@echo off
:: This batch file starts the background Instagram Checker server.
:: Double-click this file to start the application in the background!

echo Starting Instagram Checker background server...
wscript.exe "%~dp0start.vbs"
echo.
echo Server started in the background. Open http://localhost:3000
echo.
pause
