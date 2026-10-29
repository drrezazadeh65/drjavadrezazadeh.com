#Requires -Version 5.1
<# Owner-only JREI 0.1.19 shortcut writer. No network, services or keys. #>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$AppExe)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$version='0.1.19'
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
# Each shortcut is an independent OPTIONAL convenience. Desktop/OneDrive
# protection or blocked WScript.Shell must never disguise engine status or
# prevent the owner from opening the versioned JREI.exe directly.
$links=@()
$desktop=[Environment]::GetFolderPath('Desktop')
if($desktop -and (Test-Path -LiteralPath $desktop -PathType Container)){
 $links+=Join-Path $desktop 'JREI Personal AI.lnk'
}
$start=[Environment]::GetFolderPath('Programs')
if($start -and (Test-Path -LiteralPath $start -PathType Container)){
 try{
  $group=Join-Path $start 'JREI'
  if(-not (Test-Path -LiteralPath $group -PathType Container)){
   New-Item -ItemType Directory -Path $group -ErrorAction Stop|Out-Null
  }
  $links+=Join-Path $group 'JREI Personal AI.lnk'
 }catch{}
}
if($links.Count -eq 0){throw 'JREI_SHORTCUT_TARGETS_UNAVAILABLE'}
$created=0
$existingPreserved=0
try{
 $shell=New-Object -ComObject WScript.Shell -ErrorAction Stop
 foreach($path in $links){
  # Do not overwrite a shortcut whose target is not a prior JREI launch.
  # Incomplete/invalid existing .lnk files are preserved untouched.
  try {
   if(Test-Path -LiteralPath $path){
    $item=Get-Item -LiteralPath $path -Force -ErrorAction Stop
    if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){
     $existingPreserved++
     continue
    }
    $old=$shell.CreateShortcut($path)
    $target=[string]$old.TargetPath
    if((-not $target) -or
       ([IO.Path]::GetFileName($target) -ine 'JREI.exe')){
     # An unknown existing shortcut is not ours to overwrite.
     # Use a version-qualified name in the SAME permitted user directory.
     $existingPreserved++
     $path=Join-Path (Split-Path -Path $path -Parent) ('JREI Personal AI v'+$version+'.lnk')
     if(Test-Path -LiteralPath $path){
      $alternate=Get-Item -LiteralPath $path -Force -ErrorAction Stop
      if($alternate.Attributes -band [IO.FileAttributes]::ReparsePoint){continue}
      $previous=$shell.CreateShortcut($path)
      $previousTarget=[string]$previous.TargetPath
      if((-not $previousTarget) -or
         ([IO.Path]::GetFileName($previousTarget) -ine 'JREI.exe')){
       continue
      }
     }
    }elseif([IO.Path]::GetFullPath($target) -ieq $expected){
     # Existing working shortcut is already pointed at the correct release.
     # Updating it may be denied on a managed desktop: do not call that a
     # failed installation merely because the save is prohibited.
     $created++
     continue
    }
   }
   $shortcut=$shell.CreateShortcut($path)
   $shortcut.TargetPath=$expected
   $shortcut.WorkingDirectory=$base
   $shortcut.IconLocation=$expected+',0'
   $shortcut.Description='JREI private educational intelligence'
   $shortcut.Save()
   $created++
  }catch{
   # The two destination folders are independent; never throw before trying
   # the other. A failed shortcut must not be claimed as successfully saved.
  }
 }
}catch{
 throw 'JREI_SHORTCUT_WINDOWS_SHELL_UNAVAILABLE'
}
if($created -gt 0){
 Write-Output '[JREI] PROGRAM_SHORTCUTS_READY'
}else{
 throw 'JREI_SHORTCUT_TARGETS_WRITE_DENIED'
}
