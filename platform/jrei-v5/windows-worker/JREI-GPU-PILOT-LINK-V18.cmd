@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "SCRIPT=%~dp0jrei-gpu-pilot-consent.ps1"
if not exist "%SCRIPT%" (
 echo MISSING_PILOT_CONSENT_SCRIPT
 pause
 exit /b 1
)
echo JREI PRIVATE GPU PILOT - 16GB RX580
echo The Qwen3-4B model is THIRD-PARTY; it is NOT JREI's native model.
echo This action ONLY stages owner consent for the future reviewed JREI source.
echo Your currently running JREI v18 and website will NOT restart or change.
echo The existing GPU runtime and private model MUST already be approved.
choice /c YN /m "Authorize this optional, local GPU pilot for JREI"
if errorlevel 2 exit /b 0
"%PS%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%SCRIPT%" -Mode Enable -OwnerApproved
echo.
echo For Status/Disable run PowerShell with -Mode Status or Disable -OwnerApproved.
pause
endlocal
