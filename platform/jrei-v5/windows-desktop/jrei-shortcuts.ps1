#Requires -Version 5.1
<# Owner-only JREI 0.1.11 shortcut writer. No network, services or keys. #>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$AppExe)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$version='0.1.11'
if($env:OS -cne 'Windows_NT'){throw 'JREI_SHORTCUT_WINDOWS_REQUIRED'}
$base=[IO.Path]::GetFullPath($PSScriptRoot)
$expected=[IO.Path]::GetFullPath((Join-Path $base 'JREI.exe'))
if([IO.Path]::GetFullPath($AppExe) -ine $expected){
 throw 'JREI_SHORTCUT_EXE_OUTSIDE_INSTALL'
}
$approved=@(
 (Join-Path $env:LOCALAPPDATA ('Programs\JREI\releases\v'+$version)),
 (Join-Path $env:LOCALAPPDATA ('JREI-Applications\releases\v'+$version)),
 (Join-Path $env:USERPROFILE ('JREI-Applications\releases\v'+$version))
)
$allowed=$false
foreach($item in $approved){
 if([IO.Path]::GetFullPath($item) -ieq $base){$allowed=$true}
}
if(-not $allowed){
 # Only a versioned portable install beneath the owner's actual profile.
 $home=[IO.Path]::GetFullPath($env:USERPROFILE)+[IO.Path]::DirectorySeparatorChar
 $portableSuffix=[IO.Path]::DirectorySeparatorChar+
    ('JREI-Installed\releases\v'+$version)
 $allowed=($base.StartsWith($home,[StringComparison]::OrdinalIgnoreCase) -and
  $base.EndsWith($portableSuffix,[StringComparison]::OrdinalIgnoreCase))
}
if(-not $allowed){throw 'JREI_SHORTCUT_ROOT_NOT_ALLOWED'}
if(-not (Test-Path -LiteralPath $expected -PathType Leaf)){
 throw 'JREI_SHORTCUT_EXE_NOT_FOUND'
}
if((Get-Item -LiteralPath $expected).Attributes -band
  [IO.FileAttributes]::ReparsePoint){
 throw 'JREI_SHORTCUT_EXE_REPARSE_POINT'
}
$links=@()
$desktop=[Environment]::GetFolderPath('Desktop')
if($desktop -and (Test-Path -LiteralPath $desktop -PathType Container)){
 $links+=Join-Path $desktop 'JREI Personal AI.lnk'
}
$start=[Environment]::GetFolderPath('Programs')
if($start -and (Test-Path -LiteralPath $start -PathType Container)){
 $group=Join-Path $start 'JREI'
 if(-not (Test-Path -LiteralPath $group -PathType Container)){
  New-Item -ItemType Directory -Path $group -ErrorAction Stop|Out-Null
 }
 $links+=Join-Path $group 'JREI Personal AI.lnk'
}
if($links.Count -eq 0){throw 'JREI_SHORTCUT_TARGETS_NOT_AVAILABLE'}
$shell=New-Object -ComObject WScript.Shell
foreach($path in $links){
 if(Test-Path -LiteralPath $path){
  if((Get-Item -LiteralPath $path).Attributes -band
    [IO.FileAttributes]::ReparsePoint){
   throw 'JREI_SHORTCUT_LINK_REPARSE_POINT'
  }
 }
 $shortcut=$shell.CreateShortcut($path)
 $shortcut.TargetPath=$expected
 $shortcut.WorkingDirectory=$base
 $shortcut.IconLocation=$expected+',0'
 $shortcut.Description='JREI private educational intelligence'
 $shortcut.Save()
}
Write-Output '[JREI] PROGRAM_SHORTCUTS_READY'
