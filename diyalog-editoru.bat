@echo off
rem Amor - anahtar kelime ve cevap yollari editoru (tarayicida acilir)
cd /d "%~dp0"
title Amor - Diyalog editoru
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\dialog-server.ps1"
if errorlevel 1 pause
