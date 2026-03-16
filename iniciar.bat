@echo off
title Frota Bello - Sistema de Gestão de Frotas
color 0A

echo ============================================
echo   Frota Bello - Iniciando o sistema...
echo ============================================
echo.

:: Verifica se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python não encontrado!
    echo Instale o Python em: https://www.python.org/downloads/
    echo Marque a opção "Add Python to PATH" durante a instalação.
    pause
    exit /b 1
)

:: Instala dependências se necessário
echo Verificando dependências...
cd /d "%~dp0Frota_Bella\backend"
pip install -r requirements.txt -q

:: Verifica se o banco de dados existe
if not exist "frota_bello.db" (
    echo.
    echo [AVISO] Arquivo frota_bello.db não encontrado!
    echo Copie o arquivo frota_bello.db para a pasta:
    echo %~dp0Frota_Bella\backend\
    echo.
    pause
)

:: Abre o navegador após 3 segundos
echo.
echo Iniciando servidor... Abrindo navegador em 3 segundos.
start /b cmd /c "timeout /t 3 >nul && start http://localhost:8000"

:: Inicia o servidor
echo.
echo [OK] Sistema rodando em http://localhost:8000
echo Para encerrar, feche esta janela.
echo.
python -m uvicorn main:app --host 0.0.0.0 --port 8000
