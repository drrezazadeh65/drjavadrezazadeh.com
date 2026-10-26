@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Read-only status check for the existing signed Node B.
rem No credential display, task mutations or public AI activation.
cd /d "%~dp0"
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" (
  echo [JREI] TRUSTED_WINDOWS_POWERSHELL_UNAVAILABLE
  goto :finish
)
if not exist "%~dp0jrei-node-b-stability-status.ps1" (
  echo [JREI] NODE_B_READ_ONLY_STATUS_SCRIPT_MISSING
  goto :finish
)
"%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0jrei-node-b-stability-status.ps1"
if errorlevel 1 echo [JREI] NODE_B_STATUS_REQUIRES_REVIEW
:finish
echo.
pause
endlocal
