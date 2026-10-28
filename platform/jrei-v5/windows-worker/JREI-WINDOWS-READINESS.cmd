@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Read-only readiness for the original JREI Windows Command Center.
rem This does NOT install, test, restart, train or deploy anything.
set "PWSH=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "SCRIPT=%~dp0jrei-windows-release-readiness.ps1"
echo JREI - Windows Owner Release Readiness (READ ONLY)
echo --------------------------------------------------
if not exist "%PWSH%" (
 echo [JREI] WINDOWS_POWERSHELL_UNAVAILABLE
 pause
 exit /b 1
)
if not exist "%SCRIPT%" (
 echo [JREI] RELEASE_READINESS_SOURCE_NOT_PRESENT
 pause
 exit /b 1
)
"%PWSH%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%SCRIPT%"
set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo [JREI] No model, website or Windows service was changed by this check.
echo [JREI] Repeat separately on your second Windows PC when requested.
pause
exit /b %EXIT_CODE%
