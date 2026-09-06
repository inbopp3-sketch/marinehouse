@echo off
cd /d "%~dp0"
powershell -NoProfile -File "%~dp0Build-APK.ps1"
pause
