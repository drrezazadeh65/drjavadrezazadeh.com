@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem One-click owner-approved scheduling of existing hash-pinned local model
rem and only the separately authorized signed worker. Never downloads,
rem installs alternate models, changes private config or enables public AI.
cd /d "%~dp0"
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" (
  echo [JREI] TRUSTED_WINDOWS_POWERSHELL_UNAVAILABLE
  goto :finish
)
if not exist "%LOCALAPPDATA%\JREI\jrei-worker-config.json" (
  echo [JREI] EXISTING_PRIVATE_CONFIG_NOT_FOUND
  goto :finish
)
if not exist "%~dp0jrei-connect-existing-node-b.ps1" (
  echo [JREI] CONNECTOR_BUNDLE_INCOMPLETE
  goto :finish
)
echo.
echo JREI Node B: use existing Qwen and existing signed identity only.
echo This will register/start limited-privilege scheduled tasks for current user.
echo No public model exposure, credential rotation or automatic AI release.
choice /C YN /M "Authorize persistent local JREI connection"
if errorlevel 2 goto :finish
"%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0jrei-connect-existing-node-b.ps1" -OwnerApproved
if errorlevel 1 (
  echo [JREI] CONNECTION_PREPARATION_NEEDS_REVIEW
) else (
  echo [JREI] CONNECTION_TASK_PREPARATION_COMPLETED
  echo [JREI] Check Bertina signed chat/owner-pilot receipt before claiming LIVE.
)
:finish
echo.
pause
endlocal
