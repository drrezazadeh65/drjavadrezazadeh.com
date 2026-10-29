# JREI owner universal Windows installation — v0.1.12 source candidate

**Status: v0.1.11 passed its GitHub builder, but on an owner PC its program files staged while its engine setup failed with JREI_ENGINE_SETUP_FAILED. Version 0.1.12 is a SOURCE-ONLY correction. No v0.1.12 build or real-device acceptance has been verified.**

Repository: drrezazadeh65/drjavadrezazadeh.com
Canonical branch: migration/bertina-linux6

## Why the setup technology changed

The original Inno Setup owner EXEs v0.1.2–0.1.4 could show their Tk client without a working 8092 private engine. On the owner's signed **NODE_A (15.9 GB RAM)**, Inno Setup repeatedly failed **BEFORE its normal log was created** while making an is-...tmp folder with Windows error 5. The owner could create independent test folders in the same TEMP root. On signed **NODE_B (31.8 GB RAM)** the GUI launched but **8092 was not responding**; during installation the owner skipped one locked/unavailable file. None of these observations proves the earlier installer completed successfully.

**New observation on NODE_A using v0.1.6:** the native setup itself launched, but stopped with `JREI_PROGRAM_DIRECTORY_NOT_WRITABLE` while attempting its fixed `%LOCALAPPDATA%\\Programs\\JREI\\releases` program directory. This is distinct from the earlier Inno TEMP error. The subsequent **v0.1.10 source candidate** checks write access and selects from three explicitly bounded per-user destinations: the standard LocalAppData Programs directory, a separate LocalAppData JREI-Applications directory, and a UserProfile JREI-Applications directory. There is **no administrator elevation, permission reset, antivirus bypass or private-user-data migration**. The owner subsequently observed **v0.1.8** failing with `JREI_ALL_THREE_OWNER_INSTALL_LOCATIONS_DENIED`, which did **not distinguish directory-creation from file-write denial**. The v0.1.10 source distinguishes these failure stages using non-identifying error codes and additionally attempts a narrowly scoped owner-profile portable installation folder beside the extracted EXE (`JREI-Installed/releases/v0.1.10`). This is a fallback, **not proof** that a Windows security policy permits writing there; if all attempts fail, the setup stops and reports the stage without disabling protections.

On an owner device with a pre-existing unrecognized `JREI-Owner-Windows-Command-Center` task, v0.1.10 preserves that task and, if port 8092 is unoccupied, starts the packaged **original** engine on demand. The desktop reconnects on startup even without a scheduled auto-start task. This does not claim autonomous background operation while Windows is logged out, and does not enroll a new device with the remote server.

**Portable fallback note:** if the only writable location is beside the downloaded installer, the resulting JREI program directory is portable. Keep that directory intact; deleting the parent download folder would remove program binaries, although the private user data remains separate.

The **canonical existing manual GitHub workflow** has been reworked to use a **native Go Windows x64 setup EXE** instead of Inno's self-extracting setup loader. The builder also changed **both PyInstaller components to onedir** to eliminate the common PyInstaller _MEI... TEMP extraction on user machines. This is a source-level design change, **not a verified cure** until it runs on both real devices.

## Evidence from the owner 32 GB PC after the 0.1.8 build

The console now shows `OWNER_CONSOLE_LISTENING_8092`, which confirms that the local JREI command-center **bound to loopback port 8092**. It does **not** prove a trained neural language model, connected remote worker, or functional GitHub/site changes. The old installer popup `JREI_UNKNOWN_TASK_ACTION_PRESERVED` was from a controller that rejected an unrecognized legacy Windows Scheduled Task; that legacy error name does not exist in the v0.1.8 source controller. The installer error and the current listening process can therefore coexist, and installation must not be marked accepted based only on the console.

The Tk desktop's `JREI HTTP 404: NOT_FOUND` was traced to `GET /api/tasks?conversation_id=...`: the Python backend originally checked the **full request target** for literal equality with `/api/tasks`, so any query string produced a 404. The v0.1.10 source now checks the parsed URL path and the Tk GUI handles task-list read errors without claiming the main JREI engine is down. A new machine's initial missing owner-token is also treated as a controlled **first-start** condition, rather than aborting engine launch.

A running older 8092 backend may continue serving the old route after a new installer stages program files. The installer intentionally does not forcibly terminate an active owner process or scheduled task. **Source commits alone do not replace a live in-memory service.** Confirm the running backend build identity before accepting the upgrade, and perform an owner-controlled handover only when no jobs or important sessions are active.

## Exactly ONE user-facing file for all present and future PCs

At the next successful, explicitly owner-dispatched build, GitHub Actions' JREI-WINDOWS-DESKTOP-INSTALLER artifact will contain **one file**, JREI-Setup-Windows-x64-v0.1.11.exe (the GitHub artifact download itself is wrapped as a ZIP). It is a native standard-library Go EXE with a build-time embedded ZIP payload. The EXE:

1. Opens without running Inno Setup or asking for elevation.
2. Extracts the payload DIRECTLY into a **write-probed, versioned per-user folder**; preferred location is %LOCALAPPDATA%\Programs\JREI\releases\v0.1.11\, with the two approved fallbacks if local policy denies creation. Does not use %TEMP% for its own extraction. Checks entry paths, archive CRC, limits and duplicate files; refuses unsafe links or unexpected mismatching files instead of Skip.
3. Installs the version-matched native Tk client, **original** 8092 JREI Python service compiled with Python 3.13 in a PyInstaller onedir layout, owner-only setup script and hardware inventory. There is no dependency installation/download on target Windows PCs.
4. Uses the **original** JREI-Owner-Windows-Command-Center task if the current owner is verified. A new machine may register this owner-private task. An existing live verified 8092 engine is preserved. If a known, idle original action must be changed, the previous action is saved and restored upon startup failure. A running but nonresponsive owner task is NOT forcibly stopped or replaced; it becomes an explicit unresolved error.
5. Creates/repoints the per-user Desktop and Start-menu JREI Personal AI shortcuts to the **versioned** client. Old installations and old executable versions are retained for recovery.
6. Shows an unambiguous success or partial-failure dialog; does not silently assert model readiness when the offline task fails.

The same setup works for **NODE_A, NODE_B, new NODE_C/D/etc and upgraded PCs**. It re-observes local hardware and does not equate RAM capacity with node cryptographic identity.

## Explicit write/preservation policy

**Program files installed/replaced via a new immutable release folder:** native Tk GUI EXE and its onedir libraries, native frozen Python command center and libraries, immutable tracked-only site/Python/worker source snapshot, installer helper scripts, manifest and application shortcuts.

**NEVER overwritten or cloned between PCs:** %LOCALAPPDATA%\JREI\command-center\missions.sqlite3, private conversation history, owner token, individual signed worker DPAPI key and node configuration, neural weights, private files, customized Desktop\JREI-Development or %LOCALAPPDATA%\JREI-Python\repo Git clones, website production/DB, previous program release folders or any other owner's scheduled task.

The owner-private 8092 core can initialize its own database/token on first genuine start; those files are not put inside the setup artifact. The installer does NOT install a trained native conversational neural model or image-generation model, and it cannot promise ChatGPT-level answers, independent self-improvement, working GPU, server enrollment, website editing, GitHub workflow execution or cross-PC task sharing. Those remain separate evidence-based activation requirements.

## Developer provenance and owner build controls

Only the established .github/workflows/jrei-windows-desktop-exe.yml workflow runs, explicitly by manual **Run workflow** on migration/bertina-linux6, using GitHub-hosted Windows runner. It builds Python 3.13 + frozen services and the native Go setup *on the runner*, not on the owner's hardware. The run Summary should report exact GitHub source SHA, workflow run ID and final installer SHA-256. There is **no Windows publisher Authenticode signing** in this pipeline; SHA-256 is an integrity check, not publisher authentication.

The workflow runs **NO user-facing Windows acceptance tests, model training or production website deployment**. Verify actual Windows installation on both owner machines as part of the single owner-authorized integrated acceptance.

**Release safety:** do not run old v0.1.4 again, and never select Skip for a DLL/EXE copy failure. A new successful GitHub source commit is not a verified installer binary. Keep the old JREI files and signed node identities intact until the two-PC acceptance is completed.

## Diagnostic receipts

For the frozen owner engine, the helper stores a bounded sanitized local status at:
%LOCALAPPDATA%\JREI\command-center\install-receipts\latest-native-setup-receipt.json.

If the new owner EXE reports engine failure, the error code and this local receipt can be inspected **without exposing tokens, private configuration or DPAPI keys**. A running unresponsive old task must be reviewed separately instead of hidden behind a successful installer popup.

Build page: https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/workflows/jrei-windows-desktop-exe.yml


## Known owner-run failure in 0.1.9 and source-only 0.1.10 repair

On the 32-GB owner PC, the old installer displayed `JREI_8092_LISTENER_UNVERIFIED_PRESERVED`, while an owner-console previously reported `OWNER_CONSOLE_LISTENING_8092`. These facts are compatible: something was listening but the installer could not authenticate that listener using the current per-user token. Do not disable firewalls, delete tokens, kill unknown processes or remove signed node credentials as an installation workaround.

The 0.1.10 source replaces a duplicated/corrupted PowerShell controller. The revised controller uses a no-proxy direct loopback read of authenticated `/api/status` for the existing private command center, without accepting an anonymous port listener as proof. It treats `Install` as **staging program files** and reports one of: `JREI_ENGINE_AUTHENTICATED_EXISTING`, `JREI_ENGINE_AUTHENTICATED_BUNDLED`, `JREI_ENGINE_PENDING_UNVERIFIED_8092_LISTENER`, or `JREI_ENGINE_PENDING_START_NOT_VERIFIED`. When the listener cannot be authenticated, it preserves that process, writes a private bounded receipt and returns a pending state rather than declaring application files not installed.

The Go installer explicitly reads that state and distinguishes installed program files from an authenticated engine; it never claims model readiness. The shortcut writer was also replaced wholesale after finding duplicated text. No signed remote-node registration, image-model training, server deploy or live website update is part of this owner install.

**Release gate:** source changes alone are not a successfully built EXE. Use the existing one-click workflow only after coherent source inspection; the resulting owner-built artifact must still be accepted on both real PCs. The older listening engine does not become the new binary merely because a newer program folder was staged.


## Owner-proven root cause and v0.1.11 bounded response (2026-10-29)

The user directly ran the frozen v0.1.10 Python engine on a Windows owner PC. The GUI program payload and its `JREI-Engine.exe` were present. The frozen engine could not write `%LOCALAPPDATA%\\JREI\\command-center\\owner-token` (`PermissionError`); after the owner created an owner-token using the system Python 3.13, SQLite opening failed; after a real database was created, the frozen engine failed `attempt to write a readonly database`. The DB's `IsReadOnly` was `False` and the user's ACL was full access, while the normal Python executable could perform exclusive-file creation and SQLite writes in the same directory. Controlled Folder Access reported disabled. This supports **process-specific or path-specific file-write interference**, but does not identify its Windows security root cause. Do not assert a successful engine just because a system Python probe passed.

v0.1.11 adds **`jrei_service.windows_private_storage`** to the ORIGINAL 8092 service. Unlike earlier standalone test commands, **the actual frozen Python executable** checks exclusive write and transaction-capable SQLite writes, including the exact existing owner-token and missions.sqlite3 paths (rolling back probe DDL). On failure it attempts TWO bounded alternate private roots under the SAME Windows user: LocalAppData/JREI-Owner/command-center and UserProfile/JREI-Owner/command-center. It does not change Windows ACLs, elevate, disable protection or delete source data. Where old token/DB/evidence exist, they are copied (not moved) to a staging directory, file hashes are checked, and only an intact private copy with an explicit active-store marker is promoted. An inaccessible, locked, ambiguous or unsafe store fails closed with a short stable `JREI_...` error instead of inventing a healthy model. A previously selected valid same-device store is preferred at later starts. Cross-PC identity is **never** cloned.

The native Tk owner client and Windows setup helper discover the same fixed store marker before authenticating to the ORIGINAL local 8092 engine. The helper captures only sanitized fatal codes from the frozen engine and removes temporary diagnostic stderr, while leaving old processes and Windows tasks alone. Authenticated `/api/status` reports whether the current private store is original or a verified same-user fallback, without exposing local profile paths.

**Important remaining limitation:** if a Windows security product prohibits the frozen EXE from writing to *all* three private roots, the source-level fallback cannot defeat that policy and must report `JREI_FROZEN_RUNTIME_NO_WRITABLE_PRIVATE_STORE`. A correct source patch does NOT establish a successful new EXE or actual private-store access. Only real Windows acceptance can establish that; preserve the owner's current 0.1.10 files and source private data until then. The site and server are unchanged.


## Owner Windows v0.1.11 failed engine setup after successful GitHub build

The owner provided a screenshot in which `JREI-Setup-Windows-x64-v0.1.11.exe` had extracted files into an `JREI-Installed` release folder but displayed `JREI_ENGINE_SETUP_FAILED`. The screenshot does NOT establish which Windows API or program operation failed. Do not infer that source-only permission changes were accepted or that the 8092 engine started.

Source inspection found a concrete diagnostic/design flaw: a write failure in the optional installer `install-receipts` directory could propagate into the outer handler as `JREI_ENGINE_SETUP_FAILED`, masking the actual engine initialization state. The process-launch error handler also substituted an unrelated generic code when stderr capture could not be created. The **v0.1.12 source** makes receipt writing best-effort, preserves all existing private data, redirects temporary bounded engine stderr to the owner-writable versioned installation directory, and produces a stable setup stage code `JREI_SETUP_<STAGE>_FAILED` instead of a contextless error. It removes that diagnostic coupling, but the actual root cause on the owner's Windows PC remains unverified until the new binary runs. The one-click workflow still does no real Windows owner-device acceptance testing.

**Do not uninstall/delete existing owner files or forcibly stop an unidentified 8092 process.** A successful GitHub build proves artifact packaging, not private engine authentication or a working conversational model.
