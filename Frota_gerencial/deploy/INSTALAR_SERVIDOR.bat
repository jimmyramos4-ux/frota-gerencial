@echo off
title Frota Gerencial - Instalacao Inicial
echo ==========================================
echo  FROTA GERENCIAL - Instalacao Inicial
echo  Rode este script UMA VEZ no servidor
echo ==========================================

set DEPLOY_DIR=%~dp0
set PROJECT_DIR=%~dp0..
set BACKEND_DIR=%PROJECT_DIR%\backend
set CLOUDFLARED=%DEPLOY_DIR%cloudflared.exe
set CREDENTIALS_DIR=%USERPROFILE%\.cloudflared

:: 1. Criar pasta de credenciais do cloudflared
echo.
echo [1/4] Configurando Cloudflare Tunnel...
if not exist "%CREDENTIALS_DIR%" mkdir "%CREDENTIALS_DIR%"

:: Copiar credenciais do tunnel (que estao na pasta deploy)
copy "%DEPLOY_DIR%tunnel_credentials.json" "%CREDENTIALS_DIR%\65b3fd1e-da52-4689-b8ee-9966b2f21dda.json" >nul 2>&1
if %errorlevel% neq 0 (
    echo AVISO: tunnel_credentials.json nao encontrado na pasta deploy.
    echo Copie o arquivo manualmente para: %CREDENTIALS_DIR%\
    echo Nome do arquivo: 65b3fd1e-da52-4689-b8ee-9966b2f21dda.json
)

:: Criar config.yml do tunnel
echo tunnel: 65b3fd1e-da52-4689-b8ee-9966b2f21dda> "%CREDENTIALS_DIR%\config.yml"
echo.>> "%CREDENTIALS_DIR%\config.yml"
echo ingress:>> "%CREDENTIALS_DIR%\config.yml"
echo   - hostname: frota.transbottan.com.br>> "%CREDENTIALS_DIR%\config.yml"
echo     service: http://localhost:80>> "%CREDENTIALS_DIR%\config.yml"
echo   - service: http_status:404>> "%CREDENTIALS_DIR%\config.yml"
echo Config do tunnel criada em: %CREDENTIALS_DIR%\config.yml

:: 2. Instalar dependencias Python
echo.
echo [2/4] Instalando dependencias Python...
cd /d "%BACKEND_DIR%"
pip install fastapi uvicorn pandas openpyxl python-dateutil
if %errorlevel% neq 0 (
    echo ERRO ao instalar dependencias Python!
    echo Verifique se o Python esta instalado e no PATH.
    pause
    exit /b 1
)
echo Dependencias Python instaladas!

:: 3. Verificar Git
echo.
echo [3/4] Verificando Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo AVISO: Git nao encontrado. Instale o Git para usar atualizacoes automaticas.
) else (
    echo Git encontrado!
    cd /d "%PROJECT_DIR%"
    git remote -v
)

:: 4. Teste do Cloudflare Tunnel
echo.
echo [4/4] Testando conexao do tunnel...
"%CLOUDFLARED%" tunnel info 65b3fd1e-da52-4689-b8ee-9966b2f21dda
if %errorlevel% neq 0 (
    echo AVISO: Tunnel nao conectou. Verifique as credenciais.
) else (
    echo Tunnel OK!
)

echo.
echo ==========================================
echo  Instalacao concluida!
echo  Agora execute: iniciar_servidor.bat
echo ==========================================
pause
