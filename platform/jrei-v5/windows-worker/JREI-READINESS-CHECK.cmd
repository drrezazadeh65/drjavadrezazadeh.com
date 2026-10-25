@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Read-only JREI Windows doctor. No Python, install, registration or remote actions.
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo [JREI] NODE_JS_NOT_FOUND_ON_PATH
  echo The existing Node.js installation must be available to this Windows account.
  goto :end
)
echo [JREI] READ_ONLY_LOCAL_AI_READINESS
node.exe "%~dp0jrei-local-doctor.mjs"
if errorlevel 1 echo [JREI] READINESS_CHECK_FAILED
echo [JREI] No software was installed and no model was started.
:end
echo.
echo Please share only this diagnostic result, never private worker configuration or keys.
pause
endlocal
