; JREI first-party, single-file Windows installer (per-user, no UAC).
; Build ONLY on GitHub Windows Actions from the pinned canonical branch.
; Do not bundle a third-party language model, browser or any site credentials.
#define AppName "JREI"
#define AppVersion "0.1.0"
#define AppExe "JREI.exe"
[Setup]
AppId={{E3748167-9333-40BE-BF4A-1A574E4CB313}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName=JREI Personal AI {#AppVersion}
AppPublisher=JREI
DefaultDirName={localappdata}\Programs\JREI
DefaultGroupName=JREI
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
OutputDir=output
OutputBaseFilename=JREI-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\{#AppExe}
SetupLogging=yes
CloseApplications=force
RestartApplications=no
[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
[Tasks]
Name: "desktopicon"; Description: "Create JREI desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: checkedonce
[Files]
Source: "dist\{#AppExe}"; DestDir: "{app}"; Flags: ignoreversion
[Icons]
Name: "{autoprograms}\JREI"; Filename: "{app}\{#AppExe}"; WorkingDir: "{app}"
Name: "{autodesktop}\JREI"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon; WorkingDir: "{app}"
[Run]
Filename: "{app}\{#AppExe}"; Description: "Launch JREI Desktop"; Flags: nowait postinstall skipifsilent
; IMPORTANT: No [UninstallDelete] entry — source code, chat history, existing
; scheduled tasks and the owner's private SQLite files are not installer data.
