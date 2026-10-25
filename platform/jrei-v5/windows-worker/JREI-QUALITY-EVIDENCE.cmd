@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Owner-approved local-only bilingual quality evidence collector.
rem Preserves the original signed worker identity and Qwen model.
cd /d "%~dp0"
if not exist "%LOCALAPPDATA%\JREI\jrei-worker-config.json" (
  echo [JREI] PRIVATE_CONFIG_NOT_FOUND
  goto :done
)
where node.exe >nul 2>nul
if errorlevel 1 (
  echo [JREI] NODE_JS_NOT_FOUND
  goto :done
)
echo [JREI] Runs 16 fixed synthetic Persian/English prompts on local Qwen.
echo [JREI] Writes review answers ONLY under private LocalAppData JREI.
echo [JREI] No website activation, public port, cloud call or new key.
choice /C YN /M "Authorize local bilingual model quality evidence collection"
if errorlevel 2 goto :done
node.exe "%~dp0jrei-local-quality-evidence.mjs" --owner-approved
if errorlevel 1 (
  echo [JREI] QUALITY_EVIDENCE_INCOMPLETE_OR_BLOCKED
) else (
  echo [JREI] QUALITY_EVIDENCE_COLLECTED_FOR_INDEPENDENT_REVIEW
)
echo [JREI] Do not enter or invent independent quality acceptance yet.
:done
pause
endlocal
