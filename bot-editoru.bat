@echo off
rem Amor - bot modu kurallari ve otomatik ekler editoru (tarayicida acilir)
cd /d "%~dp0"
title Amor - Bot editoru
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\dialog-server.ps1" -Editor bot-editor.html
if errorlevel 1 pause
