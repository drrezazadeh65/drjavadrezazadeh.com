@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem JREI one shared native installer; THIS wrapper is for existing Node B (16GB).
rem No auto-install: inspect status first and request an explicit owner choice.
rem Use ONLY after final source acceptance and downloaded SHA-pinned artifact.
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "SCRIPT=%~dp0jrei-two-pc-owner-install.ps1"
if not exist "%PS%" (echo JREI_POWERSHELL_UNAVAILABLE& exit /b 1)
if not exist "%SCRIPT%" (echo JREI_TWO_PC_GATE_MISSING& exit /b 1)
"%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%SCRIPT%" -Node B -Mode Status -ArtifactRoot "%~dp0"
if errorlevel 1 (echo JREI_PREPARE_BLOCKED& pause& exit /b 1)
echo.
echo This installer will only replace the per-user JREI DESKTOP UI.
echo It never changes the signed worker, model, database or public site.
choice /C YN /M "Proceed with the approved Windows GUI install on THIS PC"
if errorlevel 2 (echo JREI_INSTALL_CANCELLED& exit /b 0)
"%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%SCRIPT%" -Node B -Mode Install -ArtifactRoot "%~dp0" -OwnerApproved
set "CODE=%ERRORLEVEL%"
echo.
if not "%CODE%"=="0" (echo JREI_INSTALL_NOT_CONFIRMED) else (echo JREI_GUI_ONLY_INSTALLER_FINISHED_VERIFY_BACKEND_SEPARATELY)
pause
exit /b %CODE%
