# JREI universal Windows setup — one EXE for any number of owner computers

**Source revision:** 2026-10-29. This describes the next **source-only** version `0.1.3`. A file being committed to GitHub does **not** mean a fresh binary has been built, accepted or installed. The earlier successful `0.1.2` ZIP is **not updated in place** and still contains obsolete A/B RAM-assumption scripts.

## One download, one setup file

The existing manually triggered [JREI Windows installer workflow](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/workflows/jrei-windows-desktop-exe.yml) is the only canonical builder. Its next successful artifact `JREI-WINDOWS-DESKTOP-INSTALLER` is a **GitHub-provided ZIP containing exactly one user-facing installer**:

`JREI-Setup-Windows-x64-v0.1.3.exe`

GitHub Actions artifact downloads arrive as ZIPs; after extracting that ZIP, only the EXE is needed. The GitHub run **Summary** prints the exact source commit, run ID and SHA-256. The same EXE is installed on existing owner nodes, future nodes and nodes with upgraded RAM/CPU/GPU; no model-specific or role-specific installation file is needed.

The EXE is assembled by PyInstaller + Inno Setup on a GitHub-hosted Windows runner. It installs the original JREI Tk desktop client and a small, read-only PowerShell device-inventory script. The script is embedded **inside the setup package**, not distributed as an extra file to execute separately. The installer creates Start-menu and desktop icons under the current user's profile. It never executes a hidden model installer, registers a task, calls a server registration endpoint, copies worker credentials, opens a public port or deploys Bertina.

## Dynamic machine discovery, not A/B assumptions

The GUI includes **«تشخیص و افزودن رایانه»** / *Detect and add a computer*. It can be used **even when no private JREI backend is installed**. Upon an explicit owner click it reads locally:

- current physical RAM and logical CPU threads, instead of a frozen hardware estimate;
- presence/format of existing owner-private JREI node configuration and DPAPI key **without exporting the ID, key or configuration**;
- whether the existing private Python repo, runtime, owner token and original command-center task are present.

It does **not** verify NVIDIA/AMD GPU compute, remote node registration, a signed heartbeat or neural-model performance. Its output says so. A fresh device is shown as **`NEW_NODE_OWNER_ENROLLMENT_REQUIRED`**. If a key already exists without a valid configuration, the installer displays a **review-needed** state rather than silently overwriting the key.

The hardware is re-observed when the owner opens the status view; upgrading RAM from 16 GB to 32 GB does **not** change the node's cryptographic identity. The **installer itself** imposes no two-node ceiling. Real distributed fleet scaling still requires distinct server-side registration/authorization of every new worker and actual signed health reports; installing the UI does not establish a working additional compute node.

### Correct existing signed identities, from owner screenshots

| Existing machine | Signed local node | Measured physical RAM |
|---|---|---|
| Owner's first computer | **NODE_B** | **31.8 GB** |
| Owner's second computer | **NODE_A** | **15.9 GB** |
| Future computers | Each has its own separate registered ID | Dynamically measured |

A machine's memory quantity is **never** a substitute for its signed ID. The prior A=32GB / B=16GB assumption was false.

## Backend and model boundaries

The **one EXE installs the GUI and diagnostic helper**. The private JREI command center on `127.0.0.1:8092`, its source snapshot, local mission SQLite, private chat history, model weights and the existing signed outbound worker remain separate and untouched. Existing machines with an accepted running backend can use the new GUI with that service. A brand-new machine can open the GUI and inspect onboarding requirements but must separately complete the original private service and signed-worker registration before computing or participating in the shared JREI fleet.

This is not yet a turnkey neural model deployment on an unregistered third machine. Native JREI weights, cross-node scheduling, and automatic upgrade proficiency still require independently validated evidence. No extra Aider/OpenHands program, pretrained model, cloud chatbot subscription or cloned database is bundled.

## Owner release and updates

1. Continue the single final integrated acceptance separately on the **actual devices**. Do not change `docs/governance/JREI_WINDOWS_OWNER_APP_APPROVED_SOURCE_V1.json` to `true` without actual evidence.
2. **Only after authorizing the final package build**, manually run the existing GitHub workflow on `migration/bertina-linux6`; this is the established one-click-only release process, not website deployment.
3. From its successful **Artifacts** entry download `JREI-WINDOWS-DESKTOP-INSTALLER`. Extract the GitHub ZIP and check the single EXE's SHA-256 against the run's Summary.
4. Run the **same** `JREI-Setup-Windows-x64-v0.1.3.exe` on each owner PC. No administrator rights and no node-specific `.cmd` scripts are required for the UI installation.
5. Open JREI and choose the **machine inventory** button. On a new computer follow the existing JREI server-side key registration and command-center provisioning process; never copy another PC's private worker key. Separately validate service health and completed signed heartbeats before claiming shared fleet membership.

The Windows EXE has **no publisher Authenticode signature** until an actual publisher certificate is acquired. The SHA-256 from GitHub is a download-integrity check, not a publisher identity signature. A successful GitHub package build is **not** a Windows integration test or proof that the user has installed it.

**No new EXE was built during this source-only update; no tests, training, worker registration, runtime restarts or site releases were performed.**
