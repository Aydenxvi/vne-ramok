@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22+ from https://nodejs.org/ and run this file again.
 pause
 exit /b 1
)
echo VNE RAMOK / VERSION 23 - UNIFIED 3D / PORTFOLIO
echo Open http://localhost:3000 in your browser after startup.
node server.js
pause
