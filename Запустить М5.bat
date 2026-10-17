@echo off
chcp 65001 >nul
title Транспорт М5 — локальный запуск
cd /d "%~dp0"
if not exist node_modules\react-scripts (
  echo Первый запуск: устанавливаю компоненты, это займёт 2-3 минуты...
  call npm install --no-audit --no-fund
)
echo Запускаю приложение. Оно откроется в браузере: http://localhost:3000
echo Чтобы остановить — закройте это окно.
call npm start
pause
