@echo off
cd /d "%~dp0"
color 0A
title Robô de Extração do ERP (Agendador Oficial)

echo ========================================================
echo   Robô ERP Frota Gerencial - Atualizacao Automatica
echo ========================================================
echo.
echo Este script executara o robo de extracao imediatamente.
echo Ele continuara executando em background nas seguintes 
echo frequencias configuradas:
echo DRE (30 min) / Consumo (24h) / CTRC Detalhado (24h)
echo.
echo MANTENHA ESTA JANELA PRETA MINIMIZADA!
echo Para PARAR o robo hoje, basta fechar o X dessa janela.
echo.
echo Iniciando orquestrador Python do robo na maquina local...

python run_schedule.py
pause
