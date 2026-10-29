# JREI Windows Personal AI — GitHub-synced source (2026-10-28)

This update changes **only the Windows-local JREI command-center Python modules and user interface**. No Bertina deployment, site publishing, production database mutation or tests are performed by this GitHub commit.

## Files
- `platform/jrei-python/jrei_service/windows_command_center.py` — preserves the existing Qwen adapter, status, fixed missions, recovery and legacy APIs; adds the conversational assistant endpoints.
- `platform/jrei-python/jrei_service/windows_owner_agent.py` — private SQLite conversation history, local preferences, source search/read, notes, document drafts and tool receipts.
- `platform/jrei-python/jrei_service/windows_owner_ui.html` — RTL dark conversational UI for the existing loopback port 8092.
- `platform/jrei-python/jrei_service/windows_workspace.py` — owner-confirmed isolated reversible code-drafting, never writing to the tracked Git checkout.

## Private document evidence and mission progress (source only)

The existing private document vault is extended by
`platform/jrei-python/jrei_service/windows_document_retrieval.py`: bounded
evidence passages are selected only from explicitly imported documents, and
the local chat cites verified PDF page anchors when extraction is available,
or accurately labelled extracted paragraphs/lines. Source checksums and
anchor-level evidence hashes are preserved in private operation receipts.
No document content is uploaded to GitHub or the website.

The existing `owner_tasks` SQLite queue now also records bounded,
non-model-authored progress phases in `owner_task_steps`. The local Windows
panel displays these genuine worker checkpoints while the existing
cancel-request and crash-interruption behavior remains unchanged.
The status of this source work is **UNTESTED and NOT RESTARTED ON WINDOWS**.
Neither remote CI nor the public Bertina deployment is part of this step.

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


## Windows desktop installation and ongoing updates (source added 2026-10-28)

The JREI Windows app is the **existing owner-private command center**, not a newly downloaded chatbot: its Python task runs locally on 127.0.0.1:8092, with the existing desktop shortcut opening its browser-based native-feeling RTL app. There is **no installer EXE and no claim of Microsoft Store/PWA installation**.

One-time owner installation on the PC where JREI-Python / Git and its validated runtime already exist:

1. Allow the existing Windows repository sync to finish on the canonical branch.
2. In the existing repository's platform/jrei-v5/windows-worker directory, double-click **JREI-INSTALL-WINDOWS-APP.cmd**, or run its PowerShell script with Mode Install and OwnerApproved.
3. This reuses the previously installed 8092 scheduled task (or calls the original command-center startup installer if missing); enables the existing 30-minute repo sync if needed, and stores owner-only opt-in state outside Git history.
4. New clean fast-forwarded source commits are exported from the exact Git HEAD as immutable, version-pinned snapshots under %LOCALAPPDATA%/JREI-Python/windows-owner-app-versions. The updater checks that owner activities and private image jobs are not in progress before switching **only** the original command-center task. It requires the new 8092 process to report the exact pinned commit SHA; otherwise it restores the previous task configuration.
5. Every subsequent eligible source update is checked by the **same existing** JREI-Repo-Auto-Sync (30-minute) task. Deferred updates retry later. Updates do not overwrite local owner history, passwords, documents, source edits, model weights or either outbound signed Windows worker. No second updater task or additional control server is registered.
6. Owners can check status with jrei-windows-app-auto-update.ps1 -Mode Check, or stop automatic app upgrades using -Mode Disable -OwnerApproved. Disabling leaves the last working Windows app, its history and source snapshots untouched.

### Startup update request (source change, 2026-10-29)

The existing native Tk GUI and the original command-center launcher now
request an immediate run of the **already installed** `JREI-Repo-Auto-Sync`
Windows Scheduled Task when opened. The request is conditional on the private
`windows-owner-app-auto-update.json` owner opt-in and never blocks the user
interface. It does not register a new task, run an installer, fetch a new EXE,
open a LAN port, overwrite private data, restart a busy mission, or deploy
Bertina. Missing consent, task, network or Git simply leaves the current
application working.

The existing sync task continues to enforce canonical-origin fast-forward
and delegates guarded source promotion to the original updater. The Windows
app updater's source/idle/rollback checks remain authoritative; a requested
check is not proof of a downloaded update or a changed running engine.

**Delivery boundary:** These startup hooks are source-only until incorporated
into a newly built and installed native EXE or an updated canonical local
launcher script. The existing installed EXE cannot magically gain new launch
code from a Git commit. A native EXE *binary* upgrade still requires a verified
build artifact and per-device acceptance. Nothing in this change records
the final integrated acceptance as passed.

**Important limitations:** App updates are permitted after a one-time owner opt-in on that PC; each source revision still must pass the final independent acceptance/release process before being considered fit for production. The updater implements a loopback readiness gate and preserves a reversible task-action snapshot; this is NOT a functional regression test or proof of model quality. Git pull alone does not prove an active process has updated. There is no direct remote-installation channel from this GitHub chat to the owner's two Windows PCs; installation and live synchronization are NOT CONFIRMED until Windows reports real task and revision evidence. The owner now requires native JREI language-model weights only. The source includes a lightweight local evidence-only fallback that cites the existing approved source index even without pretrained weights. This is not open-ended generative LLM chat: genuinely trained native neural weights remain future work. No independent chatbot, LM Studio, Granite or third-party model installation is part of the owner installer.

The source-only install/updater was committed with [skip ci] and no tests, Windows service restarts or Bertina publication were performed as part of development.
