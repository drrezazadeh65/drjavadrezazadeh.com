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
$version='0.1.6'
$base=Join-Path $env:LOCALAPPDATA ('Programs\JREI\releases\v'+$version)
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
