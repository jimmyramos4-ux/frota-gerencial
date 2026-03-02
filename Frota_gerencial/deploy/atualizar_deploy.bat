@echo off
title Frota Gerencial - Atualizando Deploy

set DEPLOY_DIR=%~dp0
set PROJECT_DIR=%~dp0..
set BACKEND_DIR=%PROJECT_DIR%\backend
set FRONTEND_DIR=%PROJECT_DIR%\frontend
set DIST_DIR=%PROJECT_DIR%\frontend\dist
set CADDY=%DEPLOY_DIR%caddy.exe
set CLOUDFLARED=%DEPLOY_DIR%cloudflared.exe
set CADDYFILE=%DEPLOY_DIR%_caddyfile_runtime.txt

echo ==========================================
echo  FROTA GERENCIAL - Atualizando Deploy
echo ==========================================

echo.
echo [1/5] Encerrando processos anteriores...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM caddy.exe /T 2>nul
taskkill /F /IM cloudflared.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2/5] Atualizando codigo do GitHub...
cd /d "%PROJECT_DIR%"
git pull origin main
if %errorlevel% neq 0 (
    echo AVISO: git pull falhou - continuando com codigo atual
)

echo.
echo [3/5] Fazendo build do frontend...
cd /d "%FRONTEND_DIR%"
call npm run build
if %errorlevel% neq 0 (
    echo ERRO no build! Abortando.
    pause
    exit /b 1
)

echo.
echo [4/5] Gerando configuracao do Caddy...
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
echo [5/5] Iniciando servidores...
start "Backend FastAPI" cmd /k "cd /d "%BACKEND_DIR%" && python -m uvicorn main:app --port 8000"
timeout /t 2 /nobreak >nul
start "Caddy Web Server" cmd /k ""%CADDY%" run --config "%CADDYFILE%" --adapter caddyfile"
timeout /t 2 /nobreak >nul
start "Cloudflare Tunnel" cmd /k ""%CLOUDFLARED%" tunnel --config "%USERPROFILE%\.cloudflared\config.yml" run 65b3fd1e-da52-4689-b8ee-9966b2f21dda"

echo.
echo ==========================================
echo  Deploy atualizado com sucesso!
echo  Acesse: https://frota.transbottan.com.br
echo ==========================================
pause
