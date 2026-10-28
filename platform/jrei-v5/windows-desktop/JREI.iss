; JREI Personal AI — per-user Windows desktop setup, no browser shell.
; ONE portable per-user installer works on any present or future Windows x64 PC.
; It includes the Tk GUI and READ-ONLY hardware/enrollment inventory only;
; never bundles worker credentials, a private DB, models or executables from
; another AI application. New machines open in unenrolled offline mode until
; independently registered with original signed server and original 8092.
; An existing owner-private engine is preserved and never replaced by setup.

#define MyAppName "JREI Personal AI"
#define MyAppVersion "0.1.3"
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
OutputBaseFilename=JREI-Setup-Windows-x64-v0.1.3
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

[Icons]
Name: "{autoprograms}\JREI Personal AI"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{userdesktop}\JREI Personal AI"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"

; No [Run] step: setup does not automatically run apps, scripts or enrollment.
; The original command center remains under its existing owner-private task.
; The user can open JREI and click device inventory on any Windows x64 PC.
; The same setup detects upgraded hardware afresh at each inventory read.

[UninstallDelete]
; None: the private JREI data and signed worker configuration are never removed.
