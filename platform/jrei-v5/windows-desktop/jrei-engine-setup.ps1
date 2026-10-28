#Requires -Version 5.1
<#
JREI original private 8092 — OFFLINE PROGRAM SETUP, Windows x64.
Packaged inside ONE owner-approved Inno Setup installer.
No Python, pip, GitHub or PyPI downloads on the target machine.
Program files may be updated; owner-private SQLite, token, existing chat,
DPAPI worker key, node identity, models, site and customized Git repos
are not overwritten or copied between machines.
Existing live owner-private engines are never interrupted by setup.
#>
[CmdletBinding()]
param(
 [ValidateSet('Status','Start','Install')][string]$Mode='Status',
 [switch]$OwnerApproved
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$version='0.1.6'
$taskName='JREI-Owner-Windows-Command-Center'
$private=Join-Path $env:LOCALAPPDATA 'JREI\command-center'
$receipts=Join-Path $private 'install-receipts'
$engine=Join-Path $PSScriptRoot ('engine-v'+$version+'\JREI-Engine.exe')
$source=Join-Path $PSScriptRoot ('source-v'+$version+'\platform\jrei-python\jrei_service\windows_command_center.py')
$manifest=Join-Path $PSScriptRoot 'jrei-engine-manifest.json'
$owner=[Security.Principal.WindowsIdentity]::GetCurrent()

function Emit([string]$code) {
 if($code -cnotmatch '^[A-Z0-9_]{4,100}$'){
  throw 'JREI_OFFLINE_SETUP_INVALID_EVENT'
 }
 Write-Output ('[JREI] '+$code)
}
function SafeFile([string]$file,[long]$max) {
 if(-not (Test-Path -LiteralPath $file -PathType Leaf)){return $false}
 $stat=Get-Item -LiteralPath $file -ErrorAction Stop
 return (($stat.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0 -and
         $stat.Length -gt 0 -and $stat.Length -le $max)
}
function TaskOwned($task) {
 if($null -eq $task){return $false}
 try{
  $identity=[string]$task.Principal.UserId
  if($identity -match '^S-1-[0-9]+(-[0-9]+)+$'){
   $sid=(New-Object -TypeName System.Security.Principal.SecurityIdentifier -ArgumentList $identity).Value
  }else{
   $sid=(New-Object -TypeName System.Security.Principal.NTAccount -ArgumentList $identity).Translate(
      [Security.Principal.SecurityIdentifier]).Value
  }
  return ($sid -ceq $owner.User.Value)
 }catch{return $false}
}
function TaskActionRecognized($action) {
 if($null -eq $action){return $false}
 try{
  $actual=[IO.Path]::GetFullPath(
    [Environment]::ExpandEnvironmentVariables([string]$action.Execute))
  $home=[IO.Path]::GetFullPath($PSScriptRoot)+[IO.Path]::DirectorySeparatorChar
  # Upgrade the pre-existing v0.1.4 Inno program path and future versioned
  # releases without renaming or replacing the original owner task.
  $oldHome=[IO.Path]::GetFullPath(
    (Join-Path $env:LOCALAPPDATA 'Programs\JREI'))+[IO.Path]::DirectorySeparatorChar
  $args=[string]$action.Arguments
  $oldPython=[IO.Path]::GetFullPath(
    (Join-Path $env:LOCALAPPDATA 'JREI-Python\venv\Scripts\python.exe'))
  $isOriginalPy=($actual -ieq $oldPython -and
    $args -ceq '-B -m jrei_service.windows_command_center --serve')
  $isOriginalFrozen=(
    ($actual.StartsWith($home,[StringComparison]::OrdinalIgnoreCase) -or
     $actual.StartsWith($oldHome,[StringComparison]::OrdinalIgnoreCase)) -and
    $actual -imatch '[\\/]engine-v[0-9]+\.[0-9]+\.[0-9]+[\\/]JREI-Engine\.exe
    $args -ceq '--serve'
  )
  return ($isOriginalPy -or $isOriginalFrozen)
 }catch{return $false}
}
function OwnerReady {
 $tokenPath=Join-Path $private 'owner-token'
 if(-not (SafeFile $tokenPath 256)){return $false}
 try{
  $secret=(Get-Content -LiteralPath $tokenPath -Encoding Ascii -Raw).Trim()
  if($secret -cnotmatch '^[A-Za-z0-9_-]{50,128}$'){return $false}
  $state=Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:8092/api/status' -TimeoutSec 3 -Headers @{
   Authorization=('Bearer '+$secret)
  }
  return ($state.schema -ceq 'jr.jrei.windows-command-center.v2' -and
          $state.owner_private -eq $true)
 }catch{return $false}
}
function PortBusy {
 $client=New-Object System.Net.Sockets.TcpClient
 try{
  $async=$client.BeginConnect('127.0.0.1',8092,$null,$null)
  return ($async.AsyncWaitHandle.WaitOne(850) -and $client.Connected)
 }catch{return $false}
 finally{$client.Dispose()}
}
function VerifyPackage {
 if(-not (SafeFile $engine 450MB) -or
    -not (SafeFile $manifest 10000) -or
    -not (SafeFile $source 1000000)){
  throw 'JREI_OFFLINE_INSTALL_REQUIRED_PROGRAM_FILES_MISSING'
 }
 $meta=Get-Content -LiteralPath $manifest -Encoding UTF8 -Raw |
  ConvertFrom-Json -ErrorAction Stop
 if($meta.schema -cne 'jr.jrei.offline-engine-package.v1' -or
    $meta.source_branch -cne 'migration/bertina-linux6' -or
    [string]$meta.source_commit -cnotmatch '^[a-f0-9]{40}$' -or
    [string]$meta.engine_sha256 -cnotmatch '^[a-f0-9]{64}$'){
  throw 'JREI_OFFLINE_INSTALL_PROVENANCE_INVALID'
 }
 $realHash=(Get-FileHash -LiteralPath $engine -Algorithm SHA256).Hash.ToLowerInvariant()
 if($realHash -cne [string]$meta.engine_sha256){
  throw 'JREI_OFFLINE_INSTALL_ENGINE_SHA256_MISMATCH'
 }
}
function Receipt([string]$state) {
 New-Item -ItemType Directory -Path $receipts -Force -ErrorAction Stop | Out-Null
 $value=[ordered]@{
  schema='jr.jrei.offline-owner-install.v1'
  state=$state
  recorded_utc=(Get-Date).ToUniversalTime().ToString('o')
  installer_version=$version
  owner_sid=$owner.User.Value
  code_from_exact_bundle=$true
  private_database_replaced=$false
  private_token_replaced=$false
  worker_private_key_replaced=$false
  signed_node_reassigned=$false
  model_weights_installed=$false
  website_deployed=$false
  integrated_tests_run_by_installer=$false
 }
 $path=Join-Path $receipts 'latest-native-setup-receipt.json'
 $temp=$path+'.'+[guid]::NewGuid().ToString('N')+'.tmp'
 try{
  [IO.File]::WriteAllText($temp,
    ($value|ConvertTo-Json -Depth 4 -Compress),
    [Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temp -Destination $path -Force
 }finally{
  if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Force}
 }
}
function CurrentOwnerTask {
 $existing=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 if($null -ne $existing -and -not (TaskOwned $existing)){
  throw 'JREI_UNRELATED_OWNER_TASK_PRESERVED'
 }
 return $existing
}
function WaitPrivateHealthy {
 for($i=0;$i -lt 14;$i++){
  if(OwnerReady){return $true}
  Start-Sleep -Seconds 2
 }
 return $false
}

try {
 if($env:OS -cne 'Windows_NT' -or
    -not [Environment]::Is64BitOperatingSystem){
  throw 'JREI_OFFLINE_WINDOWS_X64_REQUIRED'
 }
 VerifyPackage
 $task=CurrentOwnerTask
 if($Mode -eq 'Status'){
  Emit $(if(OwnerReady){'ORIGINAL_PRIVATE_8092_AUTHENTICATED'}else{
     'ORIGINAL_PRIVATE_8092_NOT_VERIFIED'})
  Emit $(if($null -eq $task){'ORIGINAL_TASK_NOT_REGISTERED'}else{
     'ORIGINAL_OWNER_TASK_PRESENT'})
  Emit 'NO_INSTALL_OR_RUNTIME_CHANGE'
  return
 }
 if($Mode -eq 'Start'){
  # Desktop button: only start a previously installed original owner task.
  if($null -eq $task){throw 'JREI_OWNER_ORIGINAL_TASK_MISSING'}
  if($task.Actions.Count -ne 1 -or
     -not (TaskActionRecognized $task.Actions[0])){
   throw 'JREI_OWNER_TASK_ACTION_NOT_RECOGNIZED'
  }
  if(OwnerReady){Emit 'ORIGINAL_PRIVATE_JREI_ALREADY_RUNNING';return}
  if(PortBusy){throw 'JREI_8092_UNKNOWN_PROCESS_PRESERVED'}
  Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
  if(-not (WaitPrivateHealthy)){throw 'JREI_PRIVATE_TASK_START_NOT_VERIFIED'}
  Emit 'ORIGINAL_PRIVATE_JREI_STARTED'
  return
 }
 if(-not $OwnerApproved){
  throw 'JREI_EXPLICIT_INSTALL_PERMISSION_REQUIRED'
 }
 if(OwnerReady){
  Receipt 'EXISTING_OWNER_ENGINE_LIVE_UPGRADE_DEFERRED'
  Emit 'EXISTING_OWNER_ENGINE_LIVE_PRESERVED'
  return
 }
 if(PortBusy){throw 'JREI_8092_UNKNOWN_PROCESS_PRESERVED'}
 $newAction=New-ScheduledTaskAction -Execute $engine -Argument '--serve' -WorkingDirectory (Split-Path -Path $engine -Parent)
 $created=$false
 $oldAction=$null
 if($null -eq $task){
  $trigger=New-ScheduledTaskTrigger -AtLogOn -User $owner.Name
  $principal=New-ScheduledTaskPrincipal -UserId $owner.Name -LogonType Interactive -RunLevel Limited
  $options=New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -MultipleInstances IgnoreNew -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
  Register-ScheduledTask -TaskName $taskName -Action $newAction -Trigger $trigger -Settings $options -Principal $principal -Description 'JREI original owner-private localhost 8092 command center' -ErrorAction Stop | Out-Null
  $created=$true
  Emit 'OWNER_PRIVATE_TASK_REGISTERED_OFFLINE'
 }else{
  if($task.Actions.Count -ne 1 -or
     -not (TaskActionRecognized $task.Actions[0])){
   throw 'JREI_UNKNOWN_TASK_ACTION_PRESERVED'
  }
  if((Get-ScheduledTask -TaskName $taskName).State -eq 'Running'){
   Receipt 'EXISTING_OWNER_TASK_RUNNING_NOT_INTERRUPTED'
   throw 'JREI_OWNER_TASK_RUNNING_NOT_RESPONDING_MANUAL_REVIEW_REQUIRED'
  }
  $oldAction=$task.Actions[0]
  Set-ScheduledTask -TaskName $taskName -Action $newAction -ErrorAction Stop | Out-Null
  Emit 'ORIGINAL_OWNER_TASK_ACTION_UPDATED'
 }
 try{
  Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
  if(-not (WaitPrivateHealthy)){
   throw 'JREI_OFFLINE_8092_START_NOT_RESPONDING'
  }
  Receipt 'ORIGINAL_JREI_OFFLINE_ENGINE_8092_RUNNING'
  Emit 'ORIGINAL_JREI_OFFLINE_ENGINE_8092_RUNNING'
 }catch{
  # Preserve previous task and all data on failure, with bounded rollback.
  if($created){
   Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  }elseif($null -ne $oldAction){
   Set-ScheduledTask -TaskName $taskName -Action $oldAction -ErrorAction SilentlyContinue | Out-Null
  }
  throw
 }
}catch{
 # This receipt remains on the owner PC even if installer UI hides script
 # output; never include tokens or private document contents in diagnostics.
 $code=[string]$_.Exception.Message
 if($code -notmatch '^JREI_[A-Z0-9_]{4,110}$'){
  $code='JREI_OFFLINE_WINDOWS_INSTALL_FAILED'
 }
 try{Receipt $code}catch{}
 Write-Error $code
 exit 1
}
 -and
    $args -ceq '--serve'
  )
  return ($isOriginalPy -or $isOriginalFrozen)
 }catch{return $false}
}
function OwnerReady {
 $tokenPath=Join-Path $private 'owner-token'
 if(-not (SafeFile $tokenPath 256)){return $false}
 try{
  $secret=(Get-Content -LiteralPath $tokenPath -Encoding Ascii -Raw).Trim()
  if($secret -cnotmatch '^[A-Za-z0-9_-]{50,128}$'){return $false}
  $state=Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:8092/api/status' -TimeoutSec 3 -Headers @{
   Authorization=('Bearer '+$secret)
  }
  return ($state.schema -ceq 'jr.jrei.windows-command-center.v2' -and
          $state.owner_private -eq $true)
 }catch{return $false}
}
function PortBusy {
 $client=New-Object System.Net.Sockets.TcpClient
 try{
  $async=$client.BeginConnect('127.0.0.1',8092,$null,$null)
  return ($async.AsyncWaitHandle.WaitOne(850) -and $client.Connected)
 }catch{return $false}
 finally{$client.Dispose()}
}
function VerifyPackage {
 if(-not (SafeFile $engine 450MB) -or
    -not (SafeFile $manifest 10000) -or
    -not (SafeFile $source 1000000)){
  throw 'JREI_OFFLINE_INSTALL_REQUIRED_PROGRAM_FILES_MISSING'
 }
 $meta=Get-Content -LiteralPath $manifest -Encoding UTF8 -Raw |
  ConvertFrom-Json -ErrorAction Stop
 if($meta.schema -cne 'jr.jrei.offline-engine-package.v1' -or
    $meta.source_branch -cne 'migration/bertina-linux6' -or
    [string]$meta.source_commit -cnotmatch '^[a-f0-9]{40}$' -or
    [string]$meta.engine_sha256 -cnotmatch '^[a-f0-9]{64}$'){
  throw 'JREI_OFFLINE_INSTALL_PROVENANCE_INVALID'
 }
 $realHash=(Get-FileHash -LiteralPath $engine -Algorithm SHA256).Hash.ToLowerInvariant()
 if($realHash -cne [string]$meta.engine_sha256){
  throw 'JREI_OFFLINE_INSTALL_ENGINE_SHA256_MISMATCH'
 }
}
function Receipt([string]$state) {
 New-Item -ItemType Directory -Path $receipts -Force -ErrorAction Stop | Out-Null
 $value=[ordered]@{
  schema='jr.jrei.offline-owner-install.v1'
  state=$state
  recorded_utc=(Get-Date).ToUniversalTime().ToString('o')
  installer_version=$version
  owner_sid=$owner.User.Value
  code_from_exact_bundle=$true
  private_database_replaced=$false
  private_token_replaced=$false
  worker_private_key_replaced=$false
  signed_node_reassigned=$false
  model_weights_installed=$false
  website_deployed=$false
  integrated_tests_run_by_installer=$false
 }
 $path=Join-Path $receipts 'latest-native-setup-receipt.json'
 $temp=$path+'.'+[guid]::NewGuid().ToString('N')+'.tmp'
 try{
  [IO.File]::WriteAllText($temp,
    ($value|ConvertTo-Json -Depth 4 -Compress),
    [Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temp -Destination $path -Force
 }finally{
  if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Force}
 }
}
function CurrentOwnerTask {
 $existing=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 if($null -ne $existing -and -not (TaskOwned $existing)){
  throw 'JREI_UNRELATED_OWNER_TASK_PRESERVED'
 }
 return $existing
}
function WaitPrivateHealthy {
 for($i=0;$i -lt 14;$i++){
  if(OwnerReady){return $true}
  Start-Sleep -Seconds 2
 }
 return $false
}

try {
 if($env:OS -cne 'Windows_NT' -or
    -not [Environment]::Is64BitOperatingSystem){
  throw 'JREI_OFFLINE_WINDOWS_X64_REQUIRED'
 }
 VerifyPackage
 $task=CurrentOwnerTask
 if($Mode -eq 'Status'){
  Emit $(if(OwnerReady){'ORIGINAL_PRIVATE_8092_AUTHENTICATED'}else{
     'ORIGINAL_PRIVATE_8092_NOT_VERIFIED'})
  Emit $(if($null -eq $task){'ORIGINAL_TASK_NOT_REGISTERED'}else{
     'ORIGINAL_OWNER_TASK_PRESENT'})
  Emit 'NO_INSTALL_OR_RUNTIME_CHANGE'
  return
 }
 if($Mode -eq 'Start'){
  # Desktop button: only start a previously installed original owner task.
  if($null -eq $task){throw 'JREI_OWNER_ORIGINAL_TASK_MISSING'}
  if($task.Actions.Count -ne 1 -or
     -not (TaskActionRecognized $task.Actions[0])){
   throw 'JREI_OWNER_TASK_ACTION_NOT_RECOGNIZED'
  }
  if(OwnerReady){Emit 'ORIGINAL_PRIVATE_JREI_ALREADY_RUNNING';return}
  if(PortBusy){throw 'JREI_8092_UNKNOWN_PROCESS_PRESERVED'}
  Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
  if(-not (WaitPrivateHealthy)){throw 'JREI_PRIVATE_TASK_START_NOT_VERIFIED'}
  Emit 'ORIGINAL_PRIVATE_JREI_STARTED'
  return
 }
 if(-not $OwnerApproved){
  throw 'JREI_EXPLICIT_INSTALL_PERMISSION_REQUIRED'
 }
 if(OwnerReady){
  Receipt 'EXISTING_OWNER_ENGINE_LIVE_UPGRADE_DEFERRED'
  Emit 'EXISTING_OWNER_ENGINE_LIVE_PRESERVED'
  return
 }
 if(PortBusy){throw 'JREI_8092_UNKNOWN_PROCESS_PRESERVED'}
 $newAction=New-ScheduledTaskAction -Execute $engine -Argument '--serve' -WorkingDirectory (Split-Path -Path $engine -Parent)
 $created=$false
 $oldAction=$null
 if($null -eq $task){
  $trigger=New-ScheduledTaskTrigger -AtLogOn -User $owner.Name
  $principal=New-ScheduledTaskPrincipal -UserId $owner.Name -LogonType Interactive -RunLevel Limited
  $options=New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -MultipleInstances IgnoreNew -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
  Register-ScheduledTask -TaskName $taskName -Action $newAction -Trigger $trigger -Settings $options -Principal $principal -Description 'JREI original owner-private localhost 8092 command center' -ErrorAction Stop | Out-Null
  $created=$true
  Emit 'OWNER_PRIVATE_TASK_REGISTERED_OFFLINE'
 }else{
  if($task.Actions.Count -ne 1 -or
     -not (TaskActionRecognized $task.Actions[0])){
   throw 'JREI_UNKNOWN_TASK_ACTION_PRESERVED'
  }
  if((Get-ScheduledTask -TaskName $taskName).State -eq 'Running'){
   Receipt 'EXISTING_OWNER_TASK_RUNNING_NOT_INTERRUPTED'
   Emit 'RUNNING_OWNER_TASK_NOT_INTERRUPTED'
   return
  }
  $oldAction=$task.Actions[0]
  Set-ScheduledTask -TaskName $taskName -Action $newAction -ErrorAction Stop | Out-Null
  Emit 'ORIGINAL_OWNER_TASK_ACTION_UPDATED'
 }
 try{
  Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
  if(-not (WaitPrivateHealthy)){
   throw 'JREI_OFFLINE_8092_START_NOT_RESPONDING'
  }
  Receipt 'ORIGINAL_JREI_OFFLINE_ENGINE_8092_RUNNING'
  Emit 'ORIGINAL_JREI_OFFLINE_ENGINE_8092_RUNNING'
 }catch{
  # Preserve previous task and all data on failure, with bounded rollback.
  if($created){
   Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  }elseif($null -ne $oldAction){
   Set-ScheduledTask -TaskName $taskName -Action $oldAction -ErrorAction SilentlyContinue | Out-Null
  }
  throw
 }
}catch{
 # This receipt remains on the owner PC even if installer UI hides script
 # output; never include tokens or private document contents in diagnostics.
 $code=[string]$_.Exception.Message
 if($code -notmatch '^JREI_[A-Z0-9_]{4,110}$'){
  $code='JREI_OFFLINE_WINDOWS_INSTALL_FAILED'
 }
 try{Receipt $code}catch{}
 Write-Error $code
 exit 1
}
