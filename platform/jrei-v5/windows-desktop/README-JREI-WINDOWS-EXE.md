# JREI owner universal Windows installation — v0.1.16 source candidate

**Status: the owner observed the 0.1.14 installer stage program files but fail the original 8092 private-store fallback with JREI_PRIVATE_FALLBACK_FILESYSTEM_ACCESS_DENIED on the 16-GB Windows PC. Version 0.1.15 is new source code only; NO 0.1.15 EXE, owner install, or two-device acceptance has been verified.**

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


## Owner screenshot: 0.1.12 install is NOT engine-ready

The owner's Windows screenshot from 29 October 2026 proves the v0.1.12 Go installer staged the EXE, then showed **"Program installed, shortcut unavailable"** with engine status `JREI_FROZEN_RUNTIME_NO_WRITABLE_PRIVATE_STORE`. The engine did not authenticate; the shortcut failed independently. NO further inference about the owner PC's security product or exact Windows denial is justified.

The source-only 0.1.13 repair makes **engine authentication the primary installation acceptance gate** in the Go popup and marks any unverified engine as failure, even when a shortcut is available. Windows shortcut creation attempts Desktop and Start Menu independently; if one path is blocked, it can still use the other. Existing unrelated shortcuts or reparse targets are preserved.

The Python private-store probe also no longer requests write access to an **already existing owner-token**, because the original engine reads and preserves it rather than rewriting it. File-specific SQLite write capability is still required. If the frozen process remains blocked from writing all available private roots, it fails closed and returns a bounded cause code, without disabling security, changing ACLs, inventing a successful engine, or deleting existing user data.

**Status: v0.1.13 is a source-only candidate, not an owner-tested or built release.** The established owner-only one-click GitHub workflow is manually dispatched; no deploy and no live-site change. Do not request another install on either owner PC until the evidence and release gates are satisfied.

## v0.1.14: app-local normal Python replaces the frozen engine

Owner evidence shows the normal installed CPython 3.13 on the 16-GB Windows PC could create an exclusive private file, create and modify SQLite, and keep owner permissions intact. The original PyInstaller-frozen `JREI-Engine.exe` returned access denied and readonly SQLite against the same per-user location. Source-only changes to diagnostics and private storage did not repair that process-specific failure.

Version 0.1.14 removes the frozen engine from the ONE universal Go setup payload entirely. Instead, GitHub's Windows runner bundles the original `setup-python` **Python 3.13 x64 executable, Python DLLs, standard library, isolated `python313._pth` and vendored packages** from the project's pinned Python requirements. No Python, pip or third-party package is downloaded or installed on either owner Windows PC at runtime. The GUI stays the original onedir Tk desktop. The original command center executes from the immutable `source-v0.1.14` snapshot using `python-v0.1.14/python.exe -I -B .../jrei_embedded_engine.py --serve`; it is NOT replaced with a second AI engine or pre-trained model. The service detects the versioned source root and continues to use the existing guarded same-user private storage selection and SQLite. No GPU setup is needed for an initial CPU start.

The native Go loader validates exact bundled runtime files before staging; the PowerShell controller hashes the bundled `python.exe` and checks the explicit `BUNDLED_CPYTHON_3_13` manifest. Old versioned binaries, database, owner-token, private documents, DPAPI worker identities and unrelated scheduled tasks are never deleted or rewritten. Unknown port-8092 listeners remain untouched. The existing desktop discovers/starts its matching private engine via the existing controller.

**Limitations and acceptance:** a source change and even a green packaging workflow are not proof the user's Windows security environment will allow this bundled interpreter to write. The original 32-GB PC may still run an older authenticated service; an installer must not silently replace it. The fresh offline package is larger because the complete Python runtime travels inside it. Do not claim local model weights, GPU, signed remote PC enrollment, website deployment or background autonomous upgrading are completed. First perform source integrity checks in CI, then one owner-controlled real-device install and authenticated `/api/status` before calling the release accepted. The user should not be required to execute new Python or PowerShell repair commands.

## Owner evidence: v0.1.14 still fails private-store fallback (29 October 2026)

The owner's screenshot shows one offline installer EXE `JREI-Setup-Windows-x64-v0.1.14`, a created `JREI-Installed` folder, and the explicit dialog `JREI_PRIVATE_FALLBACK_FILESYSTEM_ACCESS_DENIED`. This is a failure of the owner-local private store selection; it is **NOT** evidence of a successful backend, GPU defect, missing SDK, or broken SQLite library. The private-store source reports this final code when an attempted fallback produces a `PermissionError`; it does not disclose which source or destination operation failed. Existing identities, data and previous owner installation are still to be preserved.

Before this, the owner successfully ran **system-installed Python 3.13** to create exclusive files and write SQLite under the existing private directory. Frozen PyInstaller (0.1.10+) and the copied app-local Python process (0.1.14) did not establish a writable engine on that PC. Therefore v0.1.15 introduces a narrow automatic retry at the existing PowerShell owner-local setup controller, without any owner typing, downloads or system changes:

- Check for an already installed `py.exe` launcher and verify that its isolated `-3.13` interpreter really reports Python 3.13. If unavailable, use the included Python 3.13.
- If installed Python 3.13 is available, start an explicit version-matched `jrei_owner_python_bootstrap.py` from the installed source, run with `-I -B`, add ONLY the pinned offline JREI source and vendored library paths, then invoke the **original** 8092 command center. It uses the same source snapshot and same original per-PC SQLite/token. No second AI engine is installed.
- Do not launch the bundled fallback if the first child is still alive or 8092 is occupied; never stop a task, reset a token, reuse another PC's node identity or override Windows security. Only a stopped child may be followed by the bundled interpreter.
- Add an authenticated status field describing whether the running interpreter is owner-installed, bundled or development, without revealing absolute paths or any credential.
- In the GitHub packaging workflow require the offline bootstrap source and confirm all Python dependencies are bundled. Keep one version-specific EXE, with no website deploy, model training or background distribution.

**Owner device gate remains mandatory.** System Python access previously succeeded as a standalone probe; it is plausible but NOT proven that the original 8092 engine can now initialize its complete private database and authenticate. A green GitHub artifact build only proves packaging. Stop with a concrete error on runtime failure rather than stating that JREI is installed and intelligent. Never suggest deleting old data or disabling antivirus to pass a gate.


## Owner Windows v0.1.15: specific denied target directory, v0.1.16 response

The user's screenshot of the 0.1.15 universal installer shows **JREI_PRIVATE_TARGET_DIRECTORY_ACCESS_DENIED** and that program files were installed but the local engine was NOT authenticated. It does not establish that the official system Python 3.13 was actually used; that earlier installed interpreter had independently demonstrated working exclusive file creation and SQLite DDL on this machine. Conversely, the 0.1.15 bundled interpreter attempted to copy the owner store into a new same-user directory and Windows denied creating the target parent. This is a real error; GPU configuration cannot explain filesystem permission denial.

The existing 0.1.15 startup controller discovered a system CPython interpreter ONLY through `Get-Command py.exe` and `py -3.13`. An installed interpreter may be missing from a desktop process's PATH. The v0.1.16 source expands bounded offline discovery to the launcher, known installed Python 3.13 locations and PEP-514 Windows PythonCore registry entries, and checks each **direct python.exe** is x64 Python 3.13 with isolated, site-free `-I -S -B`. It then executes the SAME immutable original 8092 backend from the released source and bundled vendor dependencies. Neither a network download nor pip command is permitted on the owner's PC. If that runtime fails, the bundled CPython fallback is still attempted, without killing existing services, and a specific owner-interpreter error is retained when relevant.

The user's exact Windows restriction remains unconfirmed until the engine starts and an authenticated loopback status succeeds. Do not describe a GitHub green build as a working installation. v0.1.16 is a **SOURCE-ONLY CANDIDATE** until its manually dispatched workflow completes and real owner-device acceptance is recorded. Do not delete previous `owner-token`, SQLite, worker signing keys, or install folders.
