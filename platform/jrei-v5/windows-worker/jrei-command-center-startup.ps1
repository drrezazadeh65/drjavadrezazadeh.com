#Requires -Version 5.1
<#
 Owner-private JREI Windows Command Center. Registers one limited-user
 autostart task, starts it NOW, and opens the authenticated loopback UI.
 Never exposes ports on LAN, installs a model or changes 8081/8082/8091.
#>
[CmdletBinding()]
param(
 [ValidateSet('Install','Status','Open','Start','Remove')][string]$Mode='Status',
 [switch]$OwnerApproved
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT'){throw 'JREI_WINDOWS_ONLY'}
$repo=Join-Path $env:LOCALAPPDATA 'JREI-Python\repo'
$sourceRoot=Join-Path $repo 'platform\jrei-python'
$script=Join-Path $sourceRoot 'jrei_service\windows_command_center.py'
$python=Join-Path $env:LOCALAPPDATA 'JREI-Python\venv\Scripts\python.exe'
$root=Join-Path $env:LOCALAPPDATA 'JREI\command-center'
$token=Join-Path $root 'owner-token'
$taskName='JREI-Owner-Windows-Command-Center'
$ownerIdentity=[Security.Principal.WindowsIdentity]::GetCurrent()
$owner=$ownerIdentity.Name
function IsCurrentOwner([string]$registeredUser) {
 # Compare account SID, not a display name that may be short or qualified.
 if([string]::IsNullOrWhiteSpace($registeredUser)){return $false}
 try{
   if($registeredUser -match '^S-1-[0-9]+(-[0-9]+)+$'){
     $registeredSid=(New-Object -TypeName System.Security.Principal.SecurityIdentifier -ArgumentList $registeredUser).Value
   }else{
     $registeredSid=(New-Object -TypeName System.Security.Principal.NTAccount -ArgumentList $registeredUser).Translate(
       [Security.Principal.SecurityIdentifier]).Value
   }
   return $registeredSid -eq $ownerIdentity.User.Value
 }catch{
   return $false
 }
}
function Ready {
 try {
   $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8092/' -TimeoutSec 3
   # Legacy panel uses "JREI |"; the private conversational UI uses
   # "JREI AI". Both are valid loopback app pages, never a 404/redirect.
   $html=[string]$r.Content
   return ($r.StatusCode -eq 200 -and
      ($html.Contains('<title>JREI AI') -or $html.Contains('<title>JREI |')))
 }catch{return $false}
}
function OpenOwnerConsole {
 if(-not (Ready)){throw 'JREI_COMMAND_CENTER_NOT_READY'}
 if(-not (Test-Path -LiteralPath $token -PathType Leaf)){throw 'JREI_COMMAND_CENTER_OWNER_TOKEN_NOT_CREATED'}
 $secret=(Get-Content -LiteralPath $token -Raw -Encoding Ascii).Trim()
 if($secret -cnotmatch '^[A-Za-z0-9_-]{50,128}$'){
   throw 'JREI_COMMAND_CENTER_TOKEN_INVALID'
 }
 # Native EXE reads its own owner token from the private profile.
 # Never expose token through browser URL, arguments or environment.
 $desktopApp=Join-Path $env:LOCALAPPDATA 'Programs\JREI\JREI.exe'
 if(-not (Test-Path -LiteralPath $desktopApp -PathType Leaf)){
  Write-Output '[JREI] PRIVATE_ENGINE_READY_NATIVE_DESKTOP_NOT_INSTALLED'
  return
 }
 Start-Process -FilePath $desktopApp -ErrorAction Stop
 Write-Output '[JREI] NATIVE_WINDOWS_DESKTOP_APP_OPENED_NO_BROWSER'
}

function RequestOwnerApprovedSyncOnOpen {
 # Reuse the ORIGINAL repo-sync task only after per-owner local opt-in.
 # The task performs a guarded fast-forward and delegates source promotion
 # to the existing idle-aware, rollback-capable 8092 updater.
 $consentFile=Join-Path $env:LOCALAPPDATA 'JREI-Python\windows-owner-app-auto-update.json'
 try{
  if(-not (Test-Path -LiteralPath $consentFile -PathType Leaf)){return}
  $item=Get-Item -LiteralPath $consentFile -ErrorAction Stop
  if(($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or
     $item.Length -gt 4096 -or $item.Length -lt 2){return}
  $approval=Get-Content -LiteralPath $consentFile -Raw -Encoding UTF8 |
    ConvertFrom-Json -ErrorAction Stop
  if($approval.schema -cne 'jr.jrei.windows-app-auto-update.v1' -or
     $approval.enabled -ne $true -or
     $approval.ownerSid -cne $ownerIdentity.User.Value){return}
  $syncTask=Get-ScheduledTask -TaskName 'JREI-Repo-Auto-Sync' -ErrorAction SilentlyContinue
  if($null -eq $syncTask -or -not (IsCurrentOwner ([string]$syncTask.Principal.UserId)) -or
     $syncTask.Actions.Count -ne 1){return}
  $expectedShell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $expectedScript=Join-Path $repo 'platform\jrei-v5\windows-worker\jrei-repo-auto-sync.ps1'
  $expectedArgs='-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$expectedScript+'" -Mode Sync'
  if($syncTask.Actions[0].Execute -ine $expectedShell -or
     $syncTask.Actions[0].Arguments -cne $expectedArgs){return}
  Start-ScheduledTask -TaskName 'JREI-Repo-Auto-Sync' -ErrorAction Stop
  Write-Output '[JREI] OWNER_APPROVED_UPDATE_CHECK_REQUESTED'
 }catch{
  # Neither update service nor network availability may block owner chat.
  Write-Output '[JREI] OWNER_APPROVED_UPDATE_CHECK_UNAVAILABLE'
 }
}

if($Mode -eq 'Status'){
 $registered=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 Write-Output ('[JREI] WINDOWS_COMMAND_TASK='+$(if($null -eq $registered){'NOT_REGISTERED'}else{$registered.State.ToString()}))
 if($null -ne $registered){
   Write-Output ('[JREI] WINDOWS_COMMAND_TASK_OWNER='+$(if(IsCurrentOwner ([string]$registered.Principal.UserId)){'SAME_WINDOWS_ACCOUNT'}else{'DIFFERENT_OR_UNRESOLVED_ACCOUNT'}))
 }
 Write-Output ('[JREI] WINDOWS_COMMAND_HTTP_8092='+$(if(Ready){'RESPONDING'}else{'NOT_READY'}))
 Write-Output '[JREI] WINDOWS_COMMAND_CENTER_PRIVATE_ONLY'
 return
}
if($Mode -eq 'Open'){
 OpenOwnerConsole
 RequestOwnerApprovedSyncOnOpen
 return
}
if($Mode -eq 'Start'){
 # Desktop EXE launches ONLY the already-installed, signed-to-owner task.
 # Never repairs or registers a task, never opens a browser, never bypasses
 # source approval, and never changes a running mission.
 $installed=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 if($null -eq $installed){throw 'JREI_DESKTOP_EXISTING_OWNER_TASK_MISSING'}
 if(-not (IsCurrentOwner ([string]$installed.Principal.UserId))){
   throw 'JREI_DESKTOP_TASK_DIFFERENT_OWNER'
 }
 if($installed.Actions.Count -ne 1){
   throw 'JREI_DESKTOP_TASK_ACTION_INVALID'
 }
 $cmd=$installed.Actions[0]
 $expectedPython=[IO.Path]::GetFullPath($python)
 $actualPython=[IO.Path]::GetFullPath([string]$cmd.Execute)
 $work=[IO.Path]::GetFullPath([string]$cmd.WorkingDirectory)
 $sourcePrefix=[IO.Path]::GetFullPath((Join-Path $repo 'platform\jrei-python')) 
 $immutablePrefix=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'JREI-Python\windows-owner-app-versions'))
 $sourceAllowed=($work -ieq $sourcePrefix -or
   $work.StartsWith($immutablePrefix+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase))
 if(-not $sourceAllowed -or $cmd.Arguments -cne '-B -m jrei_service.windows_command_center --serve' -or
    $actualPython -ine $expectedPython -or
    -not (Test-Path -LiteralPath $cmd.Execute -PathType Leaf)){
   throw 'JREI_DESKTOP_TASK_ACTION_NOT_OWNER_APPROVED'
 }
 if(Ready){
   Write-Output '[JREI] DESKTOP_EXISTING_OWNER_TASK_RESPONDING'
   RequestOwnerApprovedSyncOnOpen
   return
 }
 Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
 for($i=0;$i -lt 12;$i++){
  if(Ready){
   Write-Output '[JREI] DESKTOP_PRIVATE_ENGINE_STARTED_WITHOUT_BROWSER'
   RequestOwnerApprovedSyncOnOpen
   return
  }
  Start-Sleep -Seconds 2
 }
 throw 'JREI_DESKTOP_PRIVATE_ENGINE_STILL_OFFLINE'
}
if(-not $OwnerApproved){throw 'JREI_EXPLICIT_OWNER_APPROVAL_REQUIRED'}
if($Mode -eq 'Remove'){
 $registered=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 if($null -ne $registered){
   Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
   Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
 }
 Write-Output '[JREI] WINDOWS_COMMAND_TASK_REMOVED_PRIVATE_HISTORY_PRESERVED'
 return
}
if(-not (Test-Path -LiteralPath $script -PathType Leaf) -or
   -not (Test-Path -LiteralPath $python -PathType Leaf) -or
   -not (Test-Path -LiteralPath $sourceRoot -PathType Container) -or
   -not (Test-Path -LiteralPath $repo -PathType Container)){
 throw 'JREI_COMMAND_CENTER_SOURCE_OR_PYTHON_NOT_FOUND'
}
$existing=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
# Python -m resolves the package from its parent directory (WorkingDirectory).
# Directly running jrei_service/windows_command_center.py cannot resolve the
# jrei_service package without a separate PYTHONPATH, as observed on Windows.
$action=New-ScheduledTaskAction -Execute $python -Argument '-B -m jrei_service.windows_command_center --serve' -WorkingDirectory $sourceRoot
if($null -eq $existing){
 $trigger=New-ScheduledTaskTrigger -AtLogOn -User $owner
 $settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -MultipleInstances IgnoreNew -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
 $principal=New-ScheduledTaskPrincipal -UserId $owner -LogonType Interactive -RunLevel Limited
 Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'JREI owner-private GPU chat, fixed missions and background learning on 127.0.0.1:8092' | Out-Null
 Write-Output '[JREI] WINDOWS_COMMAND_TASK_REGISTERED'
}else{
 # Reconcile the older installed action: "already registered" alone is not
 # success when the registered command cannot import the Python package.
 if(-not (IsCurrentOwner ([string]$existing.Principal.UserId))){
   throw 'JREI_COMMAND_TASK_DIFFERENT_WINDOWS_ACCOUNT'
 }
 $needsUpgrade=$true
 if($existing.Actions.Count -eq 1){
   $prior=$existing.Actions[0]
   $needsUpgrade=($prior.Execute -cne $action.Execute -or
      $prior.Arguments -cne $action.Arguments -or
      $prior.WorkingDirectory -cne $action.WorkingDirectory)
 }
 if($needsUpgrade){
   Set-ScheduledTask -TaskName $taskName -Action $action -ErrorAction Stop | Out-Null
   Write-Output '[JREI] WINDOWS_COMMAND_TASK_ACTION_UPGRADED'
 }else{
   Write-Output '[JREI] WINDOWS_COMMAND_TASK_ALREADY_CURRENT'
 }
}
if(-not (Ready)){
 Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
}
$ready=$false
for($i=0;$i -lt 35;$i++){
 if(Ready){$ready=$true;break}
 Start-Sleep -Seconds 2
}
if(-not $ready){throw 'JREI_COMMAND_CENTER_TASK_PRESENT_BUT_HTTP_NOT_READY'}
Write-Output '[JREI] WINDOWS_COMMAND_CENTER_RESPONDING'
$desktop=[Environment]::GetFolderPath('Desktop')
if(-not [string]::IsNullOrWhiteSpace($desktop) -and
   (Test-Path -LiteralPath $desktop -PathType Container)){
 try{
   $link=Join-Path $desktop 'JREI Command Center.lnk'
   if(-not (Test-Path -LiteralPath $link)){
     $shell=New-Object -ComObject WScript.Shell
     $shortcut=$shell.CreateShortcut($link)
     $shortcut.TargetPath=(Get-Command powershell.exe -CommandType Application).Source
     $shortcut.Arguments='-NoProfile -ExecutionPolicy Bypass -File "'+$PSCommandPath+'" -Mode Open'
     $shortcut.WorkingDirectory=$repo
     $shortcut.Description='JREI private Windows command center'
     $shortcut.Save()
   }
 }catch{
   Write-Output '[JREI] DESKTOP_SHORTCUT_OPTIONAL_UNAVAILABLE'
 }
}
OpenOwnerConsole
Write-Output '[JREI] GPU_8082_CPU_8081_PYTHON_8091_UNTOUCHED'
