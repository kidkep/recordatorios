@echo off
title Recordatorios
echo ==========================================
echo   RECORDATORIOS - Clases y trabajos
echo ==========================================
echo.

echo [1/3] Iniciando backend (puerto 4000)...
start "Recordatorios Backend" cmd /k "cd /d %~dp0backend && node server.js"
timeout /t 2 /nobreak >nul

echo [2/3] Iniciando frontend (puerto 3000)...
start "Recordatorios Frontend" cmd /k "cd /d %~dp0frontend && npx vite --host"
timeout /t 3 /nobreak >nul

echo [3/3] Abriendo la aplicacion en tu navegador...
start "" http://localhost:3000

echo.
echo ==========================================
echo   Todo listo y abierto en tu navegador!
echo   PC:      http://localhost:3000
echo   Celular: http://192.168.1.5:3000
echo ==========================================
echo.
echo (Cierra la app cerrando estas dos ventanas)
timeout /t 5 /nobreak >nul
exit
