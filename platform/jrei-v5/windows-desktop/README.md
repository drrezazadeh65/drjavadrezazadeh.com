# JREI Personal AI — native Windows desktop EXE installer

**One installed Windows application, no browser window, no external AI app.**

The source code of the desktop client is `jrei_desktop.py`, written with Python's standard Tk/Tkinter UI toolkit. It runs natively, not in WebView2, Electron, Chromium, Chrome, Edge or an embedded browser. The Windows build (PyInstaller) bundles its interpreter into `JREI.exe`. An Inno Setup per-user installer produces **`JREI-Setup-Windows-x64.exe`**, creates Start-menu/Desktop shortcuts, and adds standard Windows uninstall support.

**What it connects to:** the *existing* authenticated owner-private JREI service on `http://127.0.0.1:8092` using the already-created owner token at `%LOCALAPPDATA%\JREI\command-center\owner-token`. The desktop client does not contain this token, use an external proxy, install a pretrained model, create an independent database, change any signed two-PC worker, or deploy the website. Chat history, consent rules, task progress and generated drafts remain on the pre-existing JREI service. The GUI has a user-confirmed button to start the original `JREI-Owner-Windows-Command-Center` Scheduled Task if it is already registered locally.

**Prerequisite:** before first use on each PC, the actual original JREI Python service, private token and owner Scheduled Task must exist and be able to start. Installing the EXE client **does not** by itself install or activate this backend, train JREI weights or authenticate a second computer. If the service is offline, the GUI displays that truthful status instead of pretending to be ChatGPT.

## Desktop icon and restart safety — installer v0.1.1

The first packaged installer v0.1.0 allowed the desktop-icon task to be unselected or restored from earlier task preferences; it also launched JREI.exe automatically after setup. That did not reliably produce the single-click user experience requested by the owner. It did not explicitly request an operating-system reboot, and this repository alone cannot establish the cause of a reported Windows restart.

v0.1.1 makes the current-user Desktop and Start-menu shortcuts unconditional. Setup does **not** auto-launch JREI.exe, run any scripts, close other applications, request restart from a [Run] action, or demand elevation. Existing owner-private chats and workers remain untouched. Use this revised installer only after a new Windows packaging workflow run succeeds. The earlier workflow artifact remains the older build; a GitHub source commit does not update an already downloaded EXE.

If an old install appears to have succeeded but the Desktop icon is missing, Windows Start-menu search for "JREI Personal AI" can establish whether an installed shortcut exists. Do not rerun an unknown installer merely to check this; report the exact executable name and Windows installation/reboot history first.

## Create the downloadable EXE entirely on GitHub

The workflow is **manual** and has **no tests, no production changes, and no website deployment**:

[GitHub Actions — JREI Native Windows Desktop EXE Installer](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/workflows/jrei-windows-desktop-exe.yml)

1. In Actions, open `JREI Native Windows Desktop EXE Installer (NO DEPLOY)`, choose **Run workflow**, and keep the canonical `migration/bertina-linux6` branch.
2. Once the Windows packaging job finishes successfully, open its run's **Artifacts** and obtain `JREI-WINDOWS-DESKTOP-INSTALLER` ZIP.
3. Extract the ZIP, review the `BUILD-MANIFEST.txt` and checksum in `SHA256SUMS.txt`, and double-click **`JREI-Setup-Windows-x64.exe`**.
4. Install separately on the owner 16GB and 32GB Windows PCs. The desktop shortcut **JREI Personal AI** opens the native app, not the browser.
5. Complete the owner-approved final integrated Windows acceptance of the application and its original backend separately. A successful **build** alone is neither an integration test nor proof of model quality.

The generated installer is currently **unsigned**, so Windows SmartScreen may request additional review. Do not bypass an integrity warning without reviewing the build origin and checksum. The built Windows EXE is available **only once the workflow succeeds**; a checked-in `.iss` file or GitHub source commit is not itself a compiled installer.

## Legal and security notes

- Tk/Tkinter is part of Python's standard desktop toolkit, not another LLM or paid service.
- PyInstaller and Inno Setup are **build-time tools on the GitHub runner**, not required to be separately installed by the owner.
- No external pretrained weights, remote app APIs, browser extensions or user credentials are bundled.
- No synthetic success state is generated for a busy or untrained JREI backend.
- Local client requests go exclusively to loopback using the current owner profile's secret, never in a browser URL or process command-line argument.
- Existing JREI Windows updater has separate final source-tree acceptance gates. Installing the UI EXE does not override those gates.

## Scope of the desktop GUI

Native chat window with previous conversations, search in chat titles, Persian/English input with Shift+Enter, task submission and progress polling, selectable/copyable replies, two explicit local document attachments, cancel request and original service start. The existing browser UI remains in source for compatibility with any already-installed user sessions; the desktop shortcut and new startup path intentionally prefer the installed native app.
