# JREI — one reviewed installer for the owner's two Windows computers

**Source status, 2026-10-29:** Two-node packaging and installation code is staged on `migration/bertina-linux6`. **No Windows executable is built or installed by these source commits; no integrated two-PC acceptance has been performed.** The only release mechanism is the existing manually dispatched GitHub Actions packaging workflow.

## Two different nodes, one identical native EXE installer

| Owner Windows PC | Existing signed identity | Local role | Entrypoint after acceptance |
|---|---|---|---|
| Node A | Its **existing signed** Node A identity (RAM-independent) | **15.9 GB**, observed in the owner's second-machine terminal screenshot | `JREI-SETUP-NODE-A.cmd` |
| Node B | Its **existing signed** Node B identity (RAM-independent) | **31.8 GB** measured on the owner's screenshot; this PC is **B**, despite the previous A=32 GB assumption | `JREI-SETUP-NODE-B.cmd` |

The identities are checked **on the machine itself**, not inferred from RAM, filenames or model capacity. Signed local Node A was directly observed with 15.9 GB RAM and Node B with 31.8 GB RAM. **Do not rename Node B to A** or edit private keys to match previous guesses. Actual GPU capability and signed outbound connectivity still require separate verification; neither node gains the other PC's memory or GPU. No new model, replica database, public port, website dashboard or third-party AI application is installed.

## Exact release route (AFTER the single final acceptance)

1. Complete final integrated acceptance for the exact canonical source tree **on both PCs**. Only then may the existing `docs/governance/JREI_WINDOWS_OWNER_APP_APPROVED_SOURCE_V1.json` record have `integratedAcceptancePassed=true` and `ownerApprovedAutomaticPromotion=true` with the exact reviewed `approvedSourceTree`. Source commits, unattended tests, and package builds cannot supply that evidence.
2. At the approved final build stage only, manually run [JREI Windows desktop installer workflow](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/workflows/jrei-windows-desktop-exe.yml) on `migration/bertina-linux6`. This workflow **does not run tests, change Bertina or install anything**.
3. Download the **one** `JREI-WINDOWS-DESKTOP-INSTALLER` artifact from the successful run. It contains `JREI-Setup-Windows-x64-v0.1.2.exe`, `SHA256SUMS.txt`, `installer-manifest.json`, `BUILD-MANIFEST.txt`, `JREI-SETUP-THIS-PC.cmd`, the two role-specific `.cmd` launchers and `jrei-two-pc-owner-install.ps1`. This ZIP is not two programs.
4. Put the **same extracted folder** on each of the two PCs without moving files out of it. Retain the already connected canonical repository at `%LOCALAPPDATA%\JREI-Python\repo` on each device. Prefer `JREI-SETUP-THIS-PC.cmd` on **either** device; it reads the existing signed Node ID and selects A or B without hardware guesses. Legacy role-specific launchers remain: `JREI-SETUP-NODE-A.cmd` belongs only to signed A and `JREI-SETUP-NODE-B.cmd` only to signed B, regardless of RAM. Each launcher performs a read-only identity/source/SHA gate; if final acceptance or artifact verification is missing, it exits as **blocked** before any installation consent prompt.
5. If all the gates pass, the launcher invokes the **original** owner-private Windows command center updater (with idle checks and rollback) and then shows the normal per-user Inno Setup installer. It never starts an administrative or hidden setup. If a gate fails, keep the working version and investigate; do not alter the approved ledger to force installation.
6. Review actual authenticated `127.0.0.1:8092` service status, GUI conversation history and original signed outbound worker identity **on each machine**. A GUI process installing successfully does not establish that local neural models, GPUs, source learning, external crawling, or both signed workers are functional.

## Files and protections

- GUI: `platform/jrei-v5/windows-desktop/jrei_desktop.py`, compiled as one native Tk/PyInstaller EXE. No Electron/WebView/browser window.
- Per-user Inno Setup recipe: `platform/jrei-v5/windows-desktop/JREI.iss`; default directory: `%LOCALAPPDATA%\Programs\JREI`, with Start-menu and desktop shortcuts.
- Installer orchestration: `platform/jrei-v5/windows-worker/jrei-two-pc-owner-install.ps1` and `JREI-SETUP-NODE-A.cmd`, `JREI-SETUP-NODE-B.cmd`.
- Original backend reused: `jrei-windows-app-auto-update.ps1` and `jrei-command-center-startup.ps1`, with the original owner-SID scheduled task and original `missions.sqlite3`.
- The package manifest pins the exact source commit and installer SHA-256. **This is not code signing or proof of a safe binary.** The EXE remains unsigned; Windows SmartScreen may show a warning. Do not override a genuine integrity check to dismiss it.
- Private documents, chats, model weights, tokens and signed worker keys are **never included in the downloaded ZIP**. The wrapper does not copy them between PCs or replace them.
- Do not remove the existing Qwen runtime or previously functioning tasks merely to install the JREI native interface. JREI's independent model capabilities and trained weights are separately gated.
- There is no automatic website, database, payment or news release from the installer. Only the owner-controlled one-click production workflow can deploy the website.

## Status and rollback boundaries

The wrapper uses a different SHA-checked copy of the **same UI installer** on each device. It does not claim atomic installation on both machines, and the second PC never waits on a fictitious remote node. The private backend upgrader keeps prior source snapshots and attempts restoration if the new source does not become responsive. The Inno GUI installer itself has its standard Windows uninstaller, **not** a proven fully atomic application+model rollback.

**Current gate:** Final integrated acceptance and both Windows runtime observations remain pending. Do not run this package or claim it exists until the owner authorizes the final release build and the actual workflow artifact is present.

## Discovered identity correction — 2026-10-29

The first two-node ZIP was successfully packaged, but the owner's real 31.8-GB Windows machine reported `NodeRole=NODE_B`, `ProtocolOK=True` and `SiteOK=True`. A role-specific A launcher therefore correctly rejected this machine. The source code now uses the **signed node identity, not a RAM-based A/B assumption**, and adds `JREI-SETUP-THIS-PC.cmd` to future manually built ZIPs. **Already downloaded artifacts are immutable and do not contain these changes; a new manually dispatched build is needed after final acceptance.** No automatic rebuild, node reassignment, keys edit, test, install or live publication was performed.

## Second computer observed — signed identity versus physical memory

The owner's later second-machine screenshot independently displays the existing `nodeId=28b1c0d2-b833-41cb-97e2-df92c9373de0` and **15.9 GB RAM**, i.e. **Node A**. The first computer already showed **Node B with 31.8 GB RAM**. Thus **A=15.9 GB, B=31.8 GB** on these actual machines. These observations establish the *local file values and RAM measurement*, not proof of live signed-worker connectivity or functional AI. The originally downloaded ZIP hard-coded the opposite RAM-to-node assumption and must not be used for per-node installation. Future source fixes are absent from already built immutable ZIP artifacts. Wait for the corrected release package and independent final acceptance; do not alter a signed node ID or disable install verification.
