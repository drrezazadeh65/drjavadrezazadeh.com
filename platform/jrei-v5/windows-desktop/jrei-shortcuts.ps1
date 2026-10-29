#Requires -Version 5.1
<#
JREI ONE-FILE Windows offline installer: per-user program shortcuts only.
No shell elevation, no network, no scheduled task edits, no private data.
The installer uses this fixed script from its extracted immutable release.
#>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$AppExe)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT'){
 throw 'JREI_SHORTCUT_WINDOWS_REQUIRED'
}
$version='0.1.9'
$base=[IO.Path]::GetFullPath($PSScriptRoot)
$allowed=@(
 (Join-Path $env:LOCALAPPDATA ('Programs\JREI\releases\v'+$version)),
 (Join-Path $env:LOCALAPPDATA ('JREI-Applications\releases\v'+$version)),
 (Join-Path $env:USERPROFILE ('JREI-Applications\releases\v'+$version))
)
$match=$false
foreach($path in $allowed){
 if([IO.Path]::GetFullPath($path) -ieq $base){$match=$true}
}
if(-not $match){
 # The Go bootstrap accepts a last-resort portable location only beneath
 # the current owner's profile, alongside the downloaded installer.
 $userRoot=[IO.Path]::GetFullPath($env:USERPROFILE)+[IO.Path]::DirectorySeparatorChar
 if($base.StartsWith($userRoot,[StringComparison]::OrdinalIgnoreCase) -and
    $base -match '[\\/]JREI-Installed[\\/]releases[\\/]v0\.1\.9
$expected=Join-Path $base 'JREI.exe'
if([IO.Path]::GetFullPath($AppExe) -ine [IO.Path]::GetFullPath($expected)){
 throw 'JREI_SHORTCUT_UNEXPECTED_PROGRAM_PATH'
}
if(-not (Test-Path -LiteralPath $expected -PathType Leaf)){
 throw 'JREI_SHORTCUT_PROGRAM_MISSING'
}
if((Get-Item -LiteralPath $expected).Attributes -band
   [IO.FileAttributes]::ReparsePoint){
 throw 'JREI_SHORTCUT_PROGRAM_IS_LINK'
}
$desktop=[Environment]::GetFolderPath('Desktop')
$start=[Environment]::GetFolderPath('Programs')
$shell=New-Object -ComObject WScript.Shell
$links=@()
if(-not [string]::IsNullOrWhiteSpace($desktop) -and
   (Test-Path -LiteralPath $desktop -PathType Container)){
 $links+=Join-Path $desktop 'JREI Personal AI.lnk'
}
if(-not [string]::IsNullOrWhiteSpace($start) -and
   (Test-Path -LiteralPath $start -PathType Container)){
 $group=Join-Path $start 'JREI'
 if(-not (Test-Path -LiteralPath $group -PathType Container)){
  New-Item -Path $group -ItemType Directory -ErrorAction Stop | Out-Null
 }
 $links+=Join-Path $group 'JREI Personal AI.lnk'
}
if($links.Count -eq 0){throw 'JREI_SHORTCUT_OWNER_FOLDERS_NOT_AVAILABLE'}
foreach($path in $links){
 if(Test-Path -LiteralPath $path){
  $item=Get-Item -LiteralPath $path -ErrorAction Stop
  if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){
   throw 'JREI_SHORTCUT_EXISTING_LINK_IS_UNSAFE'
  }
 }
 $link=$shell.CreateShortcut($path)
 $link.TargetPath=$expected
 $link.WorkingDirectory=$base
 $link.IconLocation=$expected+',0'
 $link.Description='JREI private Windows educational intelligence'
 $link.Save()
}
Write-Output '[JREI] PROGRAM_SHORTCUTS_READY'
){
  $match=$true
 }
}
if(-not $match){throw 'JREI_SHORTCUT_INSTALL_ROOT_UNEXPECTED'}
$expected=Join-Path $base 'JREI.exe'
if([IO.Path]::GetFullPath($AppExe) -ine [IO.Path]::GetFullPath($expected)){
 throw 'JREI_SHORTCUT_UNEXPECTED_PROGRAM_PATH'
}
if(-not (Test-Path -LiteralPath $expected -PathType Leaf)){
 throw 'JREI_SHORTCUT_PROGRAM_MISSING'
}
if((Get-Item -LiteralPath $expected).Attributes -band
   [IO.FileAttributes]::ReparsePoint){
 throw 'JREI_SHORTCUT_PROGRAM_IS_LINK'
}
$desktop=[Environment]::GetFolderPath('Desktop')
$start=[Environment]::GetFolderPath('Programs')
$shell=New-Object -ComObject WScript.Shell
$links=@()
if(-not [string]::IsNullOrWhiteSpace($desktop) -and
   (Test-Path -LiteralPath $desktop -PathType Container)){
 $links+=Join-Path $desktop 'JREI Personal AI.lnk'
}
if(-not [string]::IsNullOrWhiteSpace($start) -and
   (Test-Path -LiteralPath $start -PathType Container)){
 $group=Join-Path $start 'JREI'
 if(-not (Test-Path -LiteralPath $group -PathType Container)){
  New-Item -Path $group -ItemType Directory -ErrorAction Stop | Out-Null
 }
 $links+=Join-Path $group 'JREI Personal AI.lnk'
}
if($links.Count -eq 0){throw 'JREI_SHORTCUT_OWNER_FOLDERS_NOT_AVAILABLE'}
foreach($path in $links){
 if(Test-Path -LiteralPath $path){
  $item=Get-Item -LiteralPath $path -ErrorAction Stop
  if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){
   throw 'JREI_SHORTCUT_EXISTING_LINK_IS_UNSAFE'
  }
 }
 $link=$shell.CreateShortcut($path)
 $link.TargetPath=$expected
 $link.WorkingDirectory=$base
 $link.IconLocation=$expected+',0'
 $link.Description='JREI private Windows educational intelligence'
 $link.Save()
}
Write-Output '[JREI] PROGRAM_SHORTCUTS_READY'
