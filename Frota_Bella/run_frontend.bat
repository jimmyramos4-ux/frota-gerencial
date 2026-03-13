@echo off
set "PATH=c:\anti\Frota_gerencial\frota-gerencial\Frota_gerencial\frontend\node-bin;%PATH%"
cd /d "c:\anti\Frota_gerencial\frota-gerencial\Frota_Bella\frontend"
echo Instalando dependencias...
call npm.cmd install
echo.
echo Iniciando frontend em http://localhost:5173
echo.
call npm.cmd run dev
