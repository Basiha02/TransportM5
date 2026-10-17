@echo off
chcp 65001 >nul
title Транспорт М5 — обновление
cd /d "%~dp0"
echo Скачиваю последнюю версию с GitHub...
git pull
call npm install --no-audit --no-fund
echo.
echo Готово. Папка обновлена до последней версии.
pause
