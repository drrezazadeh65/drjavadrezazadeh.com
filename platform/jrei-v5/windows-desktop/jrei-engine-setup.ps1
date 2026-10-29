#Requires -Version 5.1
<#
 JREI 0.1.8 owner-private Windows installation/start controller.
 Bundled with the original JREI 8092 command center and native desktop.
 NO PyPI, Git, network install, elevation, node identity reassignment,
 website publish, task deletion, credential cloning or private DB deletion.
 Legacy Windows tasks are NOT prerequisites for a functional local core.
#>
[CmdletBinding()]
param(
 [ValidateSet('Status','Start','Install')][string]$Mode='Status',
 [switch]$OwnerApproved
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$version='0.1.9'
$taskName='JREI-Owner-Windows-Command-Center'
$private=Join-Path $env:LOCALAPPDATA 'JREI\command-center'
$receipts=Join-Path $private 'install-receipts'
$engine=Join-Path $PSScriptRoot ('engine-v'+$version+'\JREI-Engine.exe')
$source=Join-Path $PSScriptRoot ('source-v'+$version+'\platform\jrei-python\jrei_service\windows_command_center.py')
$manifest=Join-Path $PSScriptRoot 'jrei-engine-manifest.json'
$owner=[Security.Principal.WindowsIdentity]::GetCurrent()
function Emit([string]$value){
 if($value -cnotmatch '^[A-Z0-9_]{4,100}$'){throw 'JREI_DIAGNOSTIC_INVALID'}
 Write-Output ('[JREI] '+$value)
}
function SafeFile([string]$path,[long]$limit){
 if(-not (Test-Path -LiteralPath $path -PathType Leaf)){return $false}
 $item=Get-Item -LiteralPath $path -ErrorAction Stop
 return ($item.Length -gt 0 -and $item.Length -le $limit -and
  -not ($item.Attributes -band [IO.FileAttributes]::ReparsePoint))
}
function VerifyPackage{
 if(-not (SafeFile $engine 450MB) -or
    -not (SafeFile $source 1000000) -or
    -not (SafeFile $manifest 10000)){
  throw 'JREI_OFFLINE_RUNTIME_MISSING'
 }
 $m=Get-Content -LiteralPath $manifest -Raw -Encoding UTF8|ConvertFrom-Json
 if($m.schema -cne 'jr.jrei.offline-engine-package.v1' -or
    $m.source_branch -cne 'migration/bertina-linux6' -or
    [string]$m.source_commit -cnotmatch '^[0-9a-f]{40}$' -or
    [string]$m.engine_sha256 -cnotmatch '^[0-9a-f]{64}$'){
  throw 'JREI_OFFLINE_BUNDLE_MANIFEST_INVALID'
 }
 if((Get-FileHash -LiteralPath $engine -Algorithm SHA256).Hash.ToLowerInvariant() -cne
   [string]$m.engine_sha256){
  throw 'JREI_OFFLINE_ENGINE_HASH_MISMATCH'
 }
}
function OwnerReady{
 $file=Join-Path $private 'owner-token'
 if(-not (SafeFile $file 256)){return $false}
 try{
  $secret=(Get-Content -LiteralPath $file -Raw -Encoding Ascii).Trim()
  if($secret -cnotmatch '^[A-Za-z0-9_-]{50,128}$'){return $false}
  $state=Invoke-RestMethod -Method Get -TimeoutSec 3 -Uri 'http://127.0.0.1:8092/api/status' -Headers @{
   Authorization=('Bearer '+$secret)
  }
  return ($state.schema -ceq 'jr.jrei.windows-command-center.v2' -and
          $state.owner_private -eq $true)
 }catch{return $false}
}
function PortBusy{
 $client=New-Object System.Net.Sockets.TcpClient
 try{
  $async=$client.BeginConnect('127.0.0.1',8092,$null,$null)
  return ($async.AsyncWaitHandle.WaitOne(650) -and $client.Connected)
 }catch{return $false}
 finally{$client.Dispose()}
}
function TaskOwned($task){
 if($null -eq $task){return $false}
 try{
  $value=[string]$task.Principal.UserId
  if($value -match '^S-1-[0-9]+(-[0-9]+)+$'){
   $sid=(New-Object -TypeName System.Security.Principal.SecurityIdentifier -ArgumentList $value).Value
  }else{
   $sid=(New-Object -TypeName System.Security.Principal.NTAccount -ArgumentList $value).
    Translate([Security.Principal.SecurityIdentifier]).Value
  }
  return ($sid -ceq $owner.User.Value)
 }catch{return $false}
}
function RecognizedTask($task){
 if($null -eq $task -or -not (TaskOwned $task) -or
    $task.Actions.Count -ne 1){return $false}
 try{
  $action=$task.Actions[0]
  $exe=[IO.Path]::GetFullPath(
    [Environment]::ExpandEnvironmentVariables([string]$action.Execute))
  $args=[string]$action.Arguments
  $oldPy=[IO.Path]::GetFullPath(
    (Join-Path $env:LOCALAPPDATA 'JREI-Python\venv\Scripts\python.exe'))
  if($exe -ieq $oldPy -and
     $args -ceq '-B -m jrei_service.windows_command_center --serve'){
   return $true
  }
  $safeRoots=@(
    (Join-Path $env:LOCALAPPDATA 'Programs\JREI'),
    (Join-Path $env:LOCALAPPDATA 'JREI-Applications\releases'),
    (Join-Path $env:USERPROFILE 'JREI-Applications\releases')
  )
  foreach($prefix in $safeRoots){
   $full=[IO.Path]::GetFullPath($prefix)+[IO.Path]::DirectorySeparatorChar
   if($exe.StartsWith($full,[StringComparison]::OrdinalIgnoreCase) -and
      $exe -imatch '[\\/]engine-v[0-9]+\.[0-9]+\.[0-9]+[\\/]JREI-Engine\.exe$' -and
      $args -ceq '--serve'){
    return $true
   }
  }
 }catch{}
 return $false
}
function Record([string]$state,[string]$taskMode){
 # Receipts only; no token, key, logs or personal file content.
 New-Item -ItemType Directory -Path $receipts -Force|Out-Null
 $data=[ordered]@{
  schema='jr.jrei.offline-owner-install.v2'
  installed_version=$version
  recorded_utc=(Get-Date).ToUniversalTime().ToString('o')
  state=$state
  task_mode=$taskMode
  private_database_replaced=$false
  owner_token_replaced=$false
  worker_identity_changed=$false
  website_published=$false
  windows_integration_test_performed=$false
 }
 $file=Join-Path $receipts 'latest-native-setup-receipt.json'
 $temp=Join-Path $receipts ('.setup-'+[guid]::NewGuid().ToString('N')+'.tmp')
 try{
  [IO.File]::WriteAllText($temp,($data|ConvertTo-Json -Compress),
    [Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temp -Destination $file -Force -ErrorAction Stop
 }finally{
  if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Force}
 }
}
function AwaitOwnerReady{
 for($n=0;$n -lt 12;$n++){
  if(OwnerReady){return $true}
  Start-Sleep -Seconds 2
 }
 return $false
}
function StartBundled {
 # Called only if neither authenticated JREI nor any other process is bound.
 # Start-Process creates a child of the current user that outlives setup.
 # Never attempts to stop or overwrite an old owner task.
 if(PortBusy){throw 'JREI_8092_LISTENER_UNVERIFIED_PRESERVED'}
 $wd=Split-Path -Path $engine -Parent
 $proc=Start-Process -FilePath $engine -ArgumentList '--serve' -WorkingDirectory $wd -WindowStyle Hidden -PassThru -ErrorAction Stop
 if($null -eq $proc){throw 'JREI_BUNDLED_ENGINE_START_FAILED'}
 if(-not (AwaitOwnerReady)){
  throw 'JREI_BUNDLED_ENGINE_HEALTH_NOT_CONFIRMED'
 }
}
function ExistingTask{
 try{return Get-ScheduledTask -TaskName $taskName -ErrorAction Stop}
 catch{
  # Missing/blocked Task Scheduler enumeration does not block local JREI.
  # We never delete or alter an unknown scheduled task.
  return $null
 }
}
try{
 if($env:OS -cne 'Windows_NT' -or -not [Environment]::Is64BitOperatingSystem){
  throw 'JREI_WINDOWS_X64_REQUIRED'
 }
 VerifyPackage
 $task=ExistingTask
 if($Mode -eq 'Status'){
  Emit $(if(OwnerReady){'JREI_ORIGINAL_ENGINE_AUTHENTICATED'}else{'JREI_PRIVATE_ENGINE_OFFLINE'})
  Emit $(if($null -eq $task){'OWNER_AUTOSTART_TASK_NOT_FOUND'}elseif(RecognizedTask $task){
   'OWNER_AUTOSTART_TASK_RECOGNIZED'}else{'LEGACY_TASK_PRESERVED_UNRECOGNIZED'})
  return
 }
 if($Mode -eq 'Install' -and -not $OwnerApproved){
  throw 'JREI_OWNER_INSTALL_APPROVAL_REQUIRED'
 }
 if(OwnerReady){
  if($Mode -eq 'Install'){Record 'EXISTING_PRIVATE_ENGINE_PRESERVED' 'UNCHANGED'}
  Emit 'JREI_ORIGINAL_ENGINE_ALREADY_RUNNING'
  return
 }
 if(PortBusy){throw 'JREI_8092_LISTENER_UNVERIFIED_PRESERVED'}
 # Existing task may point to a different legacy entry point; it MUST NOT
 # prevent installation or be auto-replaced on an owner's Windows account.
 if($null -ne $task -and -not (RecognizedTask $task)){
  StartBundled
  if($Mode -eq 'Install'){Record 'JREI_ON_DEMAND_RUNNING_LEGACY_TASK_PRESERVED' 'OLD_TASK_UNCHANGED'}
  Emit 'JREI_ENGINE_RUNNING_EXISTING_TASK_UNCHANGED'
  return
 }
 # For a recognized task we can try its existing start action first, but
 # the installer can still start the bundled original engine without
 # modifying/deleting the old task if that old action no longer works.
 if($null -ne $task){
  try{
   if($task.State -ne 'Running'){
    Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
    if(AwaitOwnerReady){
     if($Mode -eq 'Install'){Record 'RECOGNIZED_ORIGINAL_TASK_RUNNING' 'REUSED'}
     Emit 'JREI_ORIGINAL_REUSED_TASK_RUNNING'
     return
    }
   }
  }catch{}
  if(PortBusy){throw 'JREI_LEGACY_TASK_RUNNING_UNRESPONSIVE_PRESERVED'}
  StartBundled
  if($Mode -eq 'Install'){Record 'JREI_ON_DEMAND_RUNNING_OLD_TASK_PRESERVED' 'OLD_TASK_UNCHANGED'}
  Emit 'JREI_ENGINE_RUNNING_OLD_TASK_PRESERVED'
  return
 }
 # Clean PC: use the original task name. Lack of registration privileges
 # must not prevent a locally functioning engine; fall back to on-demand.
 $registered=$false
 if($Mode -eq 'Install'){
  try{
   $wd=Split-Path -Path $engine -Parent
   $action=New-ScheduledTaskAction -Execute $engine -Argument '--serve' -WorkingDirectory $wd
   $trigger=New-ScheduledTaskTrigger -AtLogOn -User $owner.Name
   $principal=New-ScheduledTaskPrincipal -UserId $owner.Name -LogonType Interactive -RunLevel Limited
   $settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -MultipleInstances IgnoreNew -StartWhenAvailable
   Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -ErrorAction Stop|Out-Null
   $registered=$true
  }catch{
   # A concurrent or managed Task Scheduler entry is never overwritten.
   $registered=$false
  }
 }
 StartBundled
 if($Mode -eq 'Install'){
  if($registered){
   Record 'JREI_PRIVATE_ENGINE_RUNNING' 'ORIGINAL_AUTOSTART_REGISTERED'
  }else{
   Record 'JREI_PRIVATE_ENGINE_RUNNING' 'ON_DEMAND_NO_AUTOSTART'
  }
 }
 Emit 'JREI_PRIVATE_ENGINE_RUNNING'
}catch{
 $code=[string]$_.Exception.Message
 if($code -cnotmatch '^JREI_[A-Z0-9_]{4,110}$'){
  $code='JREI_PRIVATE_ENGINE_SETUP_FAILED'
 }
 if($Mode -eq 'Install'){
  try{Record $code 'SETUP_FAILED_PRESERVED'}catch{}
 }
 Write-Error $code
 exit 1
}
