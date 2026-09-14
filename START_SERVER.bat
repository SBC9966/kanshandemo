@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js 20.11 or newer is required. Use OPEN_DEMO.bat for offline mode.
 pause
 exit /b 1
)
node scripts\build.mjs
if errorlevel 1 (pause & exit /b 1)
start "" http://localhost:8787
node server\index.mjs
pause
