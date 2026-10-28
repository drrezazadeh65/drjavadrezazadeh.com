#Requires -Version 5.1
<#
 Owner-private JREI Windows Command Center. Registers one limited-user
 autostart task, starts it NOW, and opens the authenticated loopback UI.
 Never exposes ports on LAN, installs a model or changes 8081/8082/8091.
#>
[CmdletBinding()]
param(
 [ValidateSet('Install','Status','Open','Remove')][string]$Mode='Status',
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
$owner=[Security.Principal.WindowsIdentity]::GetCurrent().Name
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
 $url='http://127.0.0.1:8092/#token='+[Uri]::EscapeDataString($secret)
 Start-Process $url
 Write-Output '[JREI] WINDOWS_COMMAND_CENTER_OPENED'
}
if($Mode -eq 'Status'){
 $registered=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 Write-Output ('[JREI] WINDOWS_COMMAND_TASK='+$(if($null -eq $registered){'NOT_REGISTERED'}else{$registered.State.ToString()}))
 Write-Output ('[JREI] WINDOWS_COMMAND_HTTP_8092='+$(if(Ready){'RESPONDING'}else{'NOT_READY'}))
 Write-Output '[JREI] WINDOWS_COMMAND_CENTER_PRIVATE_ONLY'
 return
}
if($Mode -eq 'Open'){
 OpenOwnerConsole
 return
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
 if($existing.Principal.UserId -cne $owner){
   throw 'JREI_COMMAND_TASK_OWNER_MISMATCH'
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
