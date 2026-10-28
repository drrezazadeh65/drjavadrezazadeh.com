# JREI Personal AI — one Windows EXE installer

**Status:** Native desktop source and the Windows packaging workflow are ready. An actual compiled binary is **not** claimed until a GitHub Actions run completes with an attached artifact. No integrated owner-Windows acceptance or live installation has yet been performed.

## Canonical app and package

- Native GUI: `platform/jrei-v5/windows-desktop/jrei_desktop.py` (Tkinter, Python stdlib; no browser window, Electron, WebView or external AI app).
- Installer recipe: `platform/jrei-v5/windows-desktop/JREI.iss` (Inno Setup; per-user and no admin; Start and desktop shortcut).
- **Single canonical build:** `.github/workflows/jrei-windows-desktop-exe.yml`. No duplicate desktop apps/build workflows. Builds on a GitHub-hosted Windows runner only. It is nondeploying and does not run integrated tests.
- Output artifact: `JREI-WINDOWS-DESKTOP-INSTALLER` containing `JREI-Setup-Windows-x64.exe`, `SHA256SUMS.txt`, `BUILD-MANIFEST.txt`.

## Owner one-click build

Open https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/workflows/jrei-windows-desktop-exe.yml, choose **Run workflow** on the canonical branch `migration/bertina-linux6`. Wait for successful completion, open the workflow run's **Artifacts**, download `JREI-WINDOWS-DESKTOP-INSTALLER`, extract it, verify SHA-256 if desired, and run `JREI-Setup-Windows-x64.exe`. GitHub Actions artifacts are ZIP containers; the installer itself is a single EXE.

Do not use the other website deployment workflow; this operation never deploys Bertina.

## What the installer actually provides

- A real standalone-looking **desktop window** with JREI conversation history, a native chat composer, actual job progress, copy controls, attachment upload and cancellation.
- Per-user installation under `%LOCALAPPDATA%\Programs\JREI`, shortcuts and uninstall entry.
- The desktop executable contains the frontend only, **not** a pretrained model, trainer, backend, token or private data.
- The same existing authenticated owner API at `127.0.0.1:8092` must already be installed on each Windows PC. If it is offline, the GUI can request safe startup of the already registered owner-SID-validated service. It does not silently register an unapproved service or replace older working versions.
- Chat history, document vault, credential material and existing worker keys remain in their original owner-private locations, untouched by installation/uninstallation of the GUI.
- This app does not imply ChatGPT-equivalent intelligence. A proven JREI-native language checkpoint is still not trained/activated.

## Platform details and limits

- Windows 10/11 x64. Installer itself is unsigned until a real publisher code-signing certificate is obtained; Windows SmartScreen may display a warning. Do not claim a code signature.
- Build tooling PyInstaller and Inno Setup run on GitHub's Windows builder, not on the owner's computers.
- A GitHub Actions build artifact is **not** a passed functional acceptance test. Do not set any acceptance ledger flags from mere compilation.
- GitHub repository source links do NOT themselves contain the final compiled installer; retrieve it from the completed Actions run.
- No live site URLs, payment system, published paths, Bertina hosting, deployment action or model weights are altered by this app.
