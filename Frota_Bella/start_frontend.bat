@echo off
set "NODE_BIN=%~dp0..\Frota_gerencial\frontend\node-bin"
set "PATH=%NODE_BIN%;%PATH%"
cd /d "%~dp0frontend"
echo Node: && node --version
echo NPM:  && npm --version
echo.
echo Installing npm dependencies...
npm install
echo.
echo Starting Frota Bella Frontend on http://localhost:5173
echo.
npm run dev