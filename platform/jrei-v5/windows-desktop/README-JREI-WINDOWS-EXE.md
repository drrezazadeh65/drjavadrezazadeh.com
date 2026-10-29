# JREI owner universal Windows installation — v0.1.8 candidate

**Status: source committed; NO v0.1.8 Windows build or real-device installation has been verified.**

Repository: drrezazadeh65/drjavadrezazadeh.com
Canonical branch: migration/bertina-linux6

## Why the setup technology changed

The original Inno Setup owner EXEs v0.1.2–0.1.4 could show their Tk client without a working 8092 private engine. On the owner's signed **NODE_A (15.9 GB RAM)**, Inno Setup repeatedly failed **BEFORE its normal log was created** while making an is-...tmp folder with Windows error 5. The owner could create independent test folders in the same TEMP root. On signed **NODE_B (31.8 GB RAM)** the GUI launched but **8092 was not responding**; during installation the owner skipped one locked/unavailable file. None of these observations proves the earlier installer completed successfully.

**New observation on NODE_A using v0.1.6:** the native setup itself launched, but stopped with `JREI_PROGRAM_DIRECTORY_NOT_WRITABLE` while attempting its fixed `%LOCALAPPDATA%\\Programs\\JREI\\releases` program directory. This is distinct from the earlier Inno TEMP error. The subsequent **v0.1.8 source candidate** checks write access and selects from three explicitly bounded per-user destinations: the standard LocalAppData Programs directory, a separate LocalAppData JREI-Applications directory, and a UserProfile JREI-Applications directory. There is **no administrator elevation, permission reset, antivirus bypass or private-user-data migration**. If all three locations fail, setup reports a fixed error and stops rather than silently claiming success.

On an owner device with a pre-existing unrecognized `JREI-Owner-Windows-Command-Center` task, v0.1.8 preserves that task and, if port 8092 is unoccupied, starts the packaged **original** engine on demand. The desktop reconnects on startup even without a scheduled auto-start task. This does not claim autonomous background operation while Windows is logged out, and does not enroll a new device with the remote server.

The **canonical existing manual GitHub workflow** has been reworked to use a **native Go Windows x64 setup EXE** instead of Inno's self-extracting setup loader. The builder also changed **both PyInstaller components to onedir** to eliminate the common PyInstaller _MEI... TEMP extraction on user machines. This is a source-level design change, **not a verified cure** until it runs on both real devices.

## Exactly ONE user-facing file for all present and future PCs

At the next successful, explicitly owner-dispatched build, GitHub Actions' JREI-WINDOWS-DESKTOP-INSTALLER artifact will contain **one file**, JREI-Setup-Windows-x64-v0.1.8.exe (the GitHub artifact download itself is wrapped as a ZIP). It is a native standard-library Go EXE with a build-time embedded ZIP payload. The EXE:

1. Opens without running Inno Setup or asking for elevation.
2. Extracts the payload DIRECTLY into a **write-probed, versioned per-user folder**; preferred location is %LOCALAPPDATA%\Programs\JREI\releases\v0.1.8\, with the two approved fallbacks if local policy denies creation. Does not use %TEMP% for its own extraction. Checks entry paths, archive CRC, limits and duplicate files; refuses unsafe links or unexpected mismatching files instead of Skip.
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
