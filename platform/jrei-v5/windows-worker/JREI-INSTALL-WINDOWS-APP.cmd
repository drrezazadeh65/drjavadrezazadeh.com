@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem JREI original Windows owner application; no parallel chatbot installer.
rem Double-click AFTER the final development/acceptance release is approved.
rem Uses only the signed-in Windows account. No administrator rights.
set "JREI_INSTALL=%~dp0jrei-windows-app-auto-update.ps1"
if not exist "%JREI_INSTALL%" (
  echo [JREI] WINDOWS_APP_INSTALLER_MISSING
  pause
  exit /b 1
)
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" (
  echo [JREI] POWERSHELL_UNAVAILABLE
  pause
  exit /b 1
)
echo.
echo [JREI] Install or update existing private Windows JREI application.
echo [JREI] Original canonical repository and owner-only 8092 task are reused.
echo [JREI] No Bertina deploy or model installation occurs.
echo.
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%JREI_INSTALL%" -Mode Install -OwnerApproved
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" (
  echo [JREI] INSTALL_NOT_CONFIRMED - SEE ERROR ABOVE.
) else (
  echo [JREI] INSTALL_REQUEST_COMPLETED - CHECK ACTUAL STATUS ABOVE.
)
pause
exit /b %RESULT%
