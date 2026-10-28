; JREI Personal AI — per-user Windows desktop setup, no browser shell.
; This installer packages only the private desktop UI EXE, not a backend
; service, GitHub token, model weights, private database, or any secret.
; Owner's JREI command center on 127.0.0.1:8092 must already be installed.
; The UI may start offline; it must never claim to install native LLM weights.

#define MyAppName "JREI Personal AI"
#define MyAppVersion "0.1.0"
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
OutputBaseFilename=JREI-Setup-Windows-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupLogging=yes
CloseApplications=yes
RestartApplications=no
UsePreviousAppDir=yes
DisableWelcomePage=no
; Do not touch the user's existing private %LOCALAPPDATA%\JREI folder or
; Windows scheduled service. Never remove chat, local models or worker keys.

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create JREI desktop shortcut"; GroupDescription: "Desktop icon:"; Flags: checkedonce

[Files]
Source: "build\JREI.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\JREI Personal AI"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{autodesktop}\JREI Personal AI"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; WorkingDir: "{app}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch JREI Personal AI"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; None: the private JREI data and signed worker configuration are never removed.
