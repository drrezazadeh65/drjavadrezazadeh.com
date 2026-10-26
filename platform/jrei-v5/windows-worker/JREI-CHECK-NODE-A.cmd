@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Read-only status for previously signed Node A, does not start anything.
cd /d "%~dp0"
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" goto :fail
if not exist "%~dp0jrei-node-a-evaluation-status.ps1" goto :fail
"%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0jrei-node-a-evaluation-status.ps1"
if errorlevel 1 echo [JREI] NODE_A_STATUS_REQUIRES_REVIEW
goto :done
:fail
echo [JREI] READ_ONLY_STATUS_PREREQUISITES_MISSING
:done
echo.
pause
endlocal
