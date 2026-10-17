@echo off
rem Amor - characters klasorune eklenen fotograf setlerini uygulamaya ekler
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\sync-characters.ps1"
pause
