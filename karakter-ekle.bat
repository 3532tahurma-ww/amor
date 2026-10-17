@echo off
rem Amor - yeni karakter ekleme / duzenleme penceresini acar
cd /d "%~dp0"
powershell -NoProfile -STA -ExecutionPolicy Bypass -File "tools\add-character.ps1"
if errorlevel 1 pause
