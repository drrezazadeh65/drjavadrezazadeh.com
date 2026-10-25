@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem JREI owner-only pilot. No installation, policy change, public AI or key reset.
cd /d "%~dp0"
set "JREI_CONFIG=%LOCALAPPDATA%\JREI\jrei-worker-config.json"
if not exist "%JREI_CONFIG%" (
  echo [JREI] OWNER_PRIVATE_CONFIG_NOT_FOUND
  goto :done
)
where node.exe >nul 2>nul
if errorlevel 1 (
  echo [JREI] NODE_JS_NOT_FOUND
  goto :done
)
echo [JREI] This is an EXPERIMENTAL OWNER-ONLY pilot.
echo [JREI] Keep your separately-running Qwen llama-server on localhost 8081.
echo [JREI] Original private flags and independent quality acceptance remain OFF.
choice /C YN /M "Authorize outbound signed owner-only JREI pilot"
if errorlevel 2 goto :done
node.exe "%~dp0jrei-worker.mjs" start-pilot "%JREI_CONFIG%"
if errorlevel 1 echo [JREI] OWNER_PILOT_WORKER_STOPPED_REQUIRES_REVIEW
:done
echo [JREI] No public AI or remote Windows port was activated.
pause
endlocal
