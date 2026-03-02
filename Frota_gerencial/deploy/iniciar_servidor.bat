@echo off
title Frota Gerencial - Servidor

:: Caminhos dinamicos baseados na localizacao deste script
set DEPLOY_DIR=%~dp0
set PROJECT_DIR=%~dp0..
set BACKEND_DIR=%PROJECT_DIR%\backend
set DIST_DIR=%PROJECT_DIR%\frontend\dist
set CADDY=%DEPLOY_DIR%caddy.exe
set CLOUDFLARED=%DEPLOY_DIR%cloudflared.exe
set CADDYFILE=%DEPLOY_DIR%_caddyfile_runtime.txt

echo ==========================================
echo  FROTA GERENCIAL - Iniciando Servidores
echo ==========================================
echo  Projeto: %PROJECT_DIR%
echo ==========================================

:: Gera Caddyfile com o caminho correto do dist
echo :80 {> "%CADDYFILE%"
echo     handle /api/* {>> "%CADDYFILE%"
echo         reverse_proxy localhost:8000>> "%CADDYFILE%"
echo     }>> "%CADDYFILE%"
echo     handle {>> "%CADDYFILE%"
echo         root * %DIST_DIR%>> "%CADDYFILE%"
echo         try_files {path} /index.html>> "%CADDYFILE%"
echo         file_server>> "%CADDYFILE%"
echo     }>> "%CADDYFILE%"
echo }>> "%CADDYFILE%"

echo.
echo [1/3] Iniciando Backend (FastAPI porta 8000)...
start "Backend FastAPI" cmd /k "cd /d "%BACKEND_DIR%" && python -m uvicorn main:app --port 8000"

timeout /t 3 /nobreak >nul

echo [2/3] Iniciando Caddy (porta 80)...
start "Caddy Web Server" cmd /k ""%CADDY%" run --config "%CADDYFILE%" --adapter caddyfile"

timeout /t 2 /nobreak >nul

echo [3/3] Iniciando Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /k ""%CLOUDFLARED%" tunnel --config "%USERPROFILE%\.cloudflared\config.yml" run 65b3fd1e-da52-4689-b8ee-9966b2f21dda"

echo.
echo ==========================================
echo  Servidores iniciados!
echo  Acesse: https://frota.transbottan.com.br
echo ==========================================
pause
