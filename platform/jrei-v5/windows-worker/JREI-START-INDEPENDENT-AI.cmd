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
choice /c YN /m "Do you authorize reviewed JREI Windows installation"
if errorlevel 2 exit /b 0
rem The first sync loads the LATEST checked-in installer script even when
rem this CMD was launched from an older local checkout.
rem Git source transfer is fast-forward only; no site or model is changed.
set "SYNC=%~dp0jrei-repo-auto-sync.ps1"
if not exist "%SYNC%" (
 echo [JREI] CANONICAL_REPO_SYNC_NOT_FOUND
 pause
 exit /b 1
)
echo [JREI] FETCHING_CANONICAL_CODE_ONLY
"%PWSH%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%SYNC%" -Mode Sync
if errorlevel 1 (
 echo [JREI] REPOSITORY_UPDATE_NOT_COMPLETED
 pause
 exit /b 1
)
rem The script path points into the same owner-private checkout, now updated.
"%PWSH%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%SCRIPT%" -Mode Install -OwnerApproved
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" (
 echo.
 echo [JREI] RELEASE_NOT_INSTALLED: Read diagnostics above. No live site changes.
) else (
 echo.
 echo [JREI] REVIEWED_PRIVATE_APP_INSTALL_SEQUENCE_FINISHED.
 echo [JREI] Latest app source must be authenticated; native LLM not yet claimed.
)
pause
exit /b %RESULT%
