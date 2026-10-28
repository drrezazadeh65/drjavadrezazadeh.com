# JREI Universal OFFLINE Windows Installer — owner source handoff

**Current source target:** `JREI-Setup-Windows-x64-v0.1.4.exe`.  
**Canonical branch:** `migration/bertina-linux6`.  
**Status:** source-only; **not built, installed or Windows-accepted** at the time of this record.

## One installer with complete program files

The original manually dispatched GitHub Actions workflow [jrei-windows-desktop-exe.yml](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/workflows/jrei-windows-desktop-exe.yml) now stages on the **Windows runner**:

- native JREI Tk GUI `JREI.exe`, with desktop/Start-menu shortcuts;
- frozen **original** Python `jrei_service.windows_command_center` as `JREI-Engine.exe` with its Python 3.13 runtime and collected libraries, including the source-owned image renderer's optional Pillow dependency;
- a version-matched, **tracked-only** source snapshot for JREI Python, worker, news, script, CSS and API code inspection (no `.git` secrets, local untracked edits or personal data);
- a fixed owner-private Windows Task Scheduler helper `jrei-engine-setup.ps1` and read-only device inventory `jrei-device-inventory.ps1`;
- the exact source commit and SHA-256 of the packaged frozen engine. The package has **no publisher signature**.

These components are enclosed **inside one Inno Setup EXE**, not transferred as separate files. GitHub's artifact service supplies the EXE within a ZIP. The target Windows computer does **not need** Python 3.13, pip, a wheelhouse, PyPI or GitHub access to **install the packaged GUI/core**. The live frozen private service continues to run on `127.0.0.1:8092`. It is not a second dashboard or a new AI model.

## Reinstall and upgrade behavior

The installer writes its own program binaries and helpers to `%LOCALAPPDATA%\Programs\JREI`. The Tk UI and helpers are replaced at the same installed paths. The version-specific frozen runtime and source tree are stored as `engine-v0.1.4` and `source-v0.1.4`: this avoids replacing a currently running engine DLL and retains previous executable versions for rollback. Future versions repeat this versioned pattern. This is an **additive program-only upgrade**; it does **not overwrite**:

- `%LOCALAPPDATA%\JREI\command-center\missions.sqlite3` (private conversations, evidence and receipts);
- `%LOCALAPPDATA%\JREI\command-center\owner-token`;
- `%LOCALAPPDATA%\JREI\jrei-worker-config.json` and DPAPI worker private keys;
- local neural model weights, user documents, notebooks, payments, website deployment or owner-customized Git checkout (`JREI-Development` or `JREI-Python\repo`).

The private core setup is an **opt-in installer task selected by default once**. It checks fixed binaries, manifest and SHA-256; refuses another Windows account's task and unknown task actions; checks authenticated original `/api/status`; and creates the original limited-user `JREI-Owner-Windows-Command-Center` task only when absent. On an existing PC whose authenticated 8092 service is running, it **preserves** the active engine and defers replacement. If the task is recognized, idle and not responding, it can update its action to the bundled runtime; a failed startup restores the previous task action when possible. An unknown listener on 8092 is not hijacked. There is no automatic disabling of safeguards or unsigned-worker-key cloning.

The device inventory in the GUI reports present RAM/CPU, OS-reported GPU adapter, owner token and task presence, and the sanitized latest `install-receipts\latest-native-setup-receipt.json` state. A fresh PC can install this private local core, but it **cannot become a trusted distributed compute node without independent signed server-side enrollment**. The installer has no arbitrary PC-count ceiling.

## Already observed Windows hardware

| Signed owner node | Measured local memory |
|---|---:|
| NODE_A (second PC) | 15.9 GB |
| NODE_B (first PC) | 31.8 GB |

RAM must never determine node identity. Upgrading RAM, CPU or GPU is detected anew by the local inventory; scheduling decisions must use later independently validated capability reports.

## Release and reality checks

1. Finish source development and perform the one owner-authorized integrated Windows acceptance on **both** actual devices; do not mark placeholder acceptance files as passed without evidence.
2. At the approved build stage, manually click **Run workflow** in the same GitHub Actions workflow. No second CI pipeline, manual FTP or production deployment.
3. Only after the GitHub runner reports success, download `JREI-WINDOWS-DESKTOP-INSTALLER`, extract the one EXE and compare its SHA-256 to the exact run Summary.
4. Close the old Tk GUI, run the one installer normally as the owner, keep its private engine setup task selected and inspect actual status on each PC. A successful UI installation does not prove model weights, GPU compute, signed fleet connectivity or autonomous self-upgrades.
5. On any failed core setup, review the **sanitized** private receipt in `%LOCALAPPDATA%\JREI\command-center\install-receipts\latest-native-setup-receipt.json`. Do not upload or expose private tokens, DPAPI keys or full local machine logs.
6. On a fresh PC, separately complete authorized signed-worker enrollment. The installer cannot fabricate remote server approval.

**Known unresolved issue:** the owner's NODE_A previously encountered Inno Setup `Error 5: Access is denied` when creating a uniquely named temporary directory, even though manual temporary-directory creation was successful. Packaging the Python engine offline removes the **PyPI dependency problem**, but **does not itself prove this separate Inno temporary-folder issue has been solved**. Do not claim installation success until the real installer runs on NODE_A.

**No new EXE was produced or run by these source-only commits.** No model training, test, owner machine changes, website deployment or task registration was performed by this authoring work.
