# JREI Windows Personal AI — GitHub-synced source (2026-10-28)

This update changes **only the Windows-local JREI command-center Python modules and user interface**. No Bertina deployment, site publishing, production database mutation or tests are performed by this GitHub commit.

## Files
- `platform/jrei-python/jrei_service/windows_command_center.py` — preserves the existing Qwen adapter, status, fixed missions, recovery and legacy APIs; adds the conversational assistant endpoints.
- `platform/jrei-python/jrei_service/windows_owner_agent.py` — private SQLite conversation history, local preferences, source search/read, notes, document drafts and tool receipts.
- `platform/jrei-python/jrei_service/windows_owner_ui.html` — RTL dark conversational UI for the existing loopback port 8092.
- `platform/jrei-python/jrei_service/windows_workspace.py` — owner-confirmed isolated reversible code-drafting, never writing to the tracked Git checkout.

## Windows sync
The existing `platform/jrei-v5/windows-worker/jrei-repo-auto-sync.ps1` pulls the canonical branch `migration/bertina-linux6` via fast-forward **only if its Windows scheduled task has already been installed and the tracked checkout is clean**. A GitHub commit cannot independently verify the scheduled task or restart processes on the owner's PC.

From a PowerShell session on the Windows computer where JREI-Python is installed:

```powershell
$sync = Join-Path $env:LOCALAPPDATA 'JREI-Python\repo\platform\jrei-v5\windows-worker\jrei-repo-auto-sync.ps1'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $sync -Mode Sync
```

If the existing Windows command-center service is running, restart only its scheduled task when convenient to load the new Python code; **do not restart the GPU or other services**:

```powershell
Stop-ScheduledTask -TaskName 'JREI-Owner-Windows-Command-Center'
Start-ScheduledTask -TaskName 'JREI-Owner-Windows-Command-Center'
```

The original command-center startup script remains the owner-authorized entry point, and its desktop shortcut can open the authenticated panel at `http://127.0.0.1:8092/`. Private history and token stay under the Windows user's `%LOCALAPPDATA%\JREI\command-center`.

**Status**: source committed for synchronization; Windows download, activation and functional acceptance remain unverified until confirmed on that computer. No tests or deployment were requested.
