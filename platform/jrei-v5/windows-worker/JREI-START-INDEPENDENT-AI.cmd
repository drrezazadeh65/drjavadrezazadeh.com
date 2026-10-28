@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem JREI original Windows AI - source controlled, no ChatGPT Plus required.
rem Only one command for the already-configured JREI Windows owner PC.
rem Never installs another chatbot or downloads external pretrained weights.
set "SCRIPT=%~dp0jrei-independent-windows-setup.ps1"
if not exist "%SCRIPT%" (
 echo [JREI] CANONICAL_INSTALL_SCRIPT_NOT_FOUND
 pause
 exit /b 1
)
set "PWSH=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PWSH%" (
 echo [JREI] WINDOWS_POWERSHELL_NOT_FOUND
 pause
 exit /b 1
)
echo.
echo JREI - Original Windows Independent AI
echo ----------------------------------------------------
echo Original private command-center, existing site workers
echo and one-click GitHub/Bertina deployment are preserved.
echo This action syncs original JREI Windows code and starts its
echo existing private command center. No other application,
echo cloud language model or pretrained weights are installed.
echo The native evidence and learning engine runs locally.
echo A trained general-purpose language model is NOT yet ready.
echo ----------------------------------------------------
choice /c YN /m "Do you authorize local JREI code update and private startup"
if errorlevel 2 exit /b 0
"%PWSH%" -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -Mode Install -OwnerApproved
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" (
 echo.
 echo [JREI] INSTALL_NOT_COMPLETED: Review the diagnostic above.
) else (
 echo.
 echo [JREI] INSTALL_SEQUENCE_RETURNED_SUCCESS.
 echo [JREI] Check actual private model and app status on this PC.
)
pause
exit /b %RESULT%
