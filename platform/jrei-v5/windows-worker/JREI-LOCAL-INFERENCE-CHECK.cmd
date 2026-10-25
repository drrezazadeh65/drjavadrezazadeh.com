@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Owner-initiated real local Qwen inference benchmark; never installs Python.
rem Requires a previously approved llama-server running on 127.0.0.1.
cd /d "%~dp0"
set "JREI_CONFIG=%LOCALAPPDATA%\JREI\jrei-worker-config.json"
if not exist "%JREI_CONFIG%" (
 echo [JREI] PRIVATE_CONFIG_NOT_FOUND
 echo This script does not create or overwrite worker configuration or keys.
 goto :done
)
where node.exe >nul 2>nul
if errorlevel 1 (
 echo [JREI] NODE_JS_NOT_FOUND_ON_PATH
 goto :done
)
echo [JREI] This sends two synthetic prompts ONLY to approved local loopback.
echo [JREI] No private files, model output, credentials or student data are uploaded.
choice /C YN /M "Authorize this local model technical benchmark now"
if errorlevel 2 goto :done
node.exe "%~dp0jrei-local-model-benchmark.mjs" --owner-approved "%JREI_CONFIG%"
if errorlevel 1 (
 echo [JREI] BENCHMARK_NOT_ACCEPTED_OR_FAILED
 echo Review approved GGUF/runtime hashes and local server startup.
) else (
 echo [JREI] LOCAL_TECHNICAL_BENCHMARK_COMPLETED
 echo [JREI] This does NOT activate public traffic or certify model quality.
)
:done
pause
endlocal
