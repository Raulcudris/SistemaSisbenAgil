@echo off
chcp 65001 >nul
title Agente de impresion SisbénÁgil
cd /d "%~dp0..\printer-agent"

if not exist "agent.js" (
  echo No se encontro printer-agent\agent.js
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias del agente de impresion...
  call npm install
  if errorlevel 1 (
    echo.
    echo No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando agente de impresion SisbénÁgil...
echo Deje esta ventana abierta mientras el kiosco este en uso.
echo.
call npm start
echo.
echo El agente de impresion se detuvo.
pause
