@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Owner-approved Node A EXISTING signed evaluation worker only.
rem Does not run Qwen, edit private keys, or change Node B.
cd /d "%~dp0"
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" (
  echo [JREI] WINDOWS_POWERSHELL_UNAVAILABLE
  goto :finish
)
if not exist "%~dp0jrei-connect-existing-node-a-evaluation.ps1" (
  echo [JREI] NODE_A_EVALUATION_BUNDLE_INCOMPLETE
  goto :finish
)
echo Node A only: verify original signed configuration, and register/start
echo its existing outbound evaluation task after owner confirmation.
echo No model installation, public chat activation or Node B changes.
choice /C YN /M "Authorize signed Node A evaluation connection"
if errorlevel 2 goto :finish
"%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0jrei-connect-existing-node-a-evaluation.ps1" -OwnerApproved
if errorlevel 1 (
  echo [JREI] NODE_A_CONNECTION_NEEDS_REVIEW
) else (
  echo [JREI] NODE_A_EVALUATION_TASK_PREPARED
)
:finish
echo.
pause
endlocal
