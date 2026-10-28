; JREI Personal AI — per-user Windows desktop setup, no browser shell.
; ONE portable per-user installer works on any present or future Windows x64 PC.
; The bundle includes the original private 8092 Python command center
; frozen for Windows, its pinned read-only source snapshot, the native Tk
; client and offline hardware inventory. No Python, pip, Git or PyPI downloads
; on target PCs. Existing private database, worker keys, chats and weights
; remain outside {app}, intact even when program files are overwritten.
; A NEW node still requires its own signed worker enrollment with the server.

#define MyAppName "JREI Personal AI"
#define MyAppVersion "0.1.4"
#define MyPublisher "Javad Rezazadeh"
#define MyAppExeName "JREI.exe"

[Setup]
AppId={{B62D6A1B-7236-4E89-9807-4D5D7EE8BF71}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyPublisher}
AppPublisherURL=https://drjavadrezazadeh.com/
AppSupportURL=https://drjavadrezazadeh.com/
DefaultDirName={localappdata}\Programs\JREI
DefaultGroupName=JREI
UninstallDisplayIcon={app}\{#MyAppExeName}
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes
OutputDir=output
OutputBaseFilename=JREI-Setup-Windows-x64-v0.1.4
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupLogging=yes
CloseApplications=no
RestartApplications=no
RestartIfNeededByRun=no
AlwaysRestart=no
UsePreviousAppDir=yes
UsePreviousTasks=no
DisableWelcomePage=no
; Do not touch the user's existing private %LOCALAPPDATA%\JREI folder or
; Windows scheduled service. Never remove chat, local models or worker keys.

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "build\JREI.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "jrei-device-inventory.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "jrei-engine-setup.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\jrei-engine-manifest.json"; DestDir: "{app}"; Flags: ignoreversion
; Versioned frozen core: never replace a running executable or DLL
; during upgrade; prior versions remain available for owner rollback.
Source: "build\engine\*"; DestDir: "{app}\engine-v{#MyAppVersion}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "build\source\*"; DestDir: "{app}\source-v{#MyAppVersion}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Tasks]
; Checked once by default: per-user offline engine registration/reconciliation.
; Existing live JREI owner task and private data are always preserved.
Name: "privateengine"; Description: "Set up existing private JREI 8092 engine from included offline files"; Flags: checkedonce

[Icons]
Name: "{autoprograms}\JREI Personal AI"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{userdesktop}\JREI Personal AI"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"

[Run]
; Explicitly selected installer task; PowerShell only reads fixed LOCAL
; installed script. No server enrollment, model training, site deployment or
; privileged elevation. A running original private engine is left untouched.
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""{app}\jrei-engine-setup.ps1"" -Mode Install -OwnerApproved"; WorkingDir: "{app}"; Tasks: privateengine; Flags: runhidden waituntilterminated; StatusMsg: "Preparing original private JREI engine from bundled offline files..."

[UninstallDelete]
; None: the private JREI data and signed worker configuration are never removed.
