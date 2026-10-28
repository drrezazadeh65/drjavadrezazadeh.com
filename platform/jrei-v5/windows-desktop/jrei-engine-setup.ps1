#Requires -Version 5.1
<#
 JREI ORIGINAL PRIVATE 8092 engine — offline, per-user Windows setup.
 Included INSIDE the one Inno Setup EXE alongside the existing native GUI.
 No Python/pip/Git/PyPI needed on destination machine for the bundled core.
 Reuses existing task name, owner identity, localhost port, SQLite and token.
 Does not copy/replace DPAPI worker keys, a site DB, model weights, logs, docs,
 external site state or owner-customized Git checkout.
 Existing active 8092 engine is NEVER interrupted by an installer.
#>
[CmdletBinding()]
param([ValidateSet('Status','Start','Install')][string]$Mode='Status',
      [switch]$OwnerApproved)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT' -or -not [Environment]::Is64BitOperatingSystem){
 throw 'JREI_PRIVATE_ENGINE_WINDOWS_X64_ONLY'
}
# Versioned runtime files prevent Windows DLL locks from clobbering a
# running original engine during future upgrades. Previous versions remain
# available for task-action rollback, while this version's files are replaced
# idempotently by the same Inno app identity.
$engine=Join-Path $PSScriptRoot 'engine-v0.1.4\JREI-Engine.exe'
$manifest=Join-Path $PSScriptRoot 'jrei-engine-manifest.json'
$taskName='JREI-Owner-Windows-Command-Center'
$private=Join-Path $env:LOCALAPPDATA 'JREI\command-center'
$receipts=Join-Path $private 'install-receipts'
$owner=[Security.Principal.WindowsIdentity]::GetCurrent()
$task=$null
function Emit([string]$message) {
 if($message -cnotmatch '^[A-Z0-9_]{4,110}$'){throw 'JREI_INSTALL_STATUS_INVALID'}
 Write-Output ('[JREI] '+$message)
}
function SafeArtifact([string]$path,[long]$maxSize) {
 if(-not (Test-Path -LiteralPath $path -PathType Leaf)){return $false}
 $f=Get-Item -LiteralPath $path -ErrorAction Stop
 return (-not ($f.Attributes -band [IO.FileAttributes]::ReparsePoint) -and
         $f.Length -gt 0 -and $f.Length -le $maxSize)
}
function TaskOwned([object]$candidate) {
 try{
  $who=[string]$candidate.Principal.UserId
  if($who -match '^S-1-[0-9]+(-[0-9]+)+$'){
   $sid=(New-Object -TypeName System.Security.Principal.SecurityIdentifier -ArgumentList $who).Value
  }else{
   $sid=(New-Object Security.Principal.NTAccount($who)).
      Translate([Security.Principal.SecurityIdentifier]).Value
  }
  return $sid -ceq $owner.User.Value
 }catch{return $false}
}
function LocalReady {
 try {
  $response=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8092/' -TimeoutSec 3
  $html=[string]$response.Content
  return ($response.StatusCode -eq 200 -and
          ($html.Contains('<title>JREI AI') -or
           $html.Contains('<title>JREI |')))
 }catch{return $false}
}
function Receipt([string]$state) {
 New-Item -ItemType Directory -Path $receipts -Force -ErrorAction Stop | Out-Null
 $value=@{
  schema='jr.jrei.frozen-8092-install.v1'
  at=(Get-Date).ToUniversalTime().ToString('o')
  state=$state
  owner_sid=$owner.User.Value
  original_task='JREI-Owner-Windows-Command-Center'
  database_or_token_overwritten=$false
  worker_key_or_node_id_changed=$false
  website_deployed=$false
  model_weights_installed=$false
  integration_tests_performed=$false
 }
 $path=Join-Path $receipts 'latest-native-setup-receipt.json'
 $tmp=$path+'.'+[guid]::NewGuid().ToString('N')+'.tmp'
 try{
  [IO.File]::WriteAllText($tmp,($value|ConvertTo-Json -Compress),
       [Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $tmp -Destination $path -Force
 }finally{if(Test-Path -LiteralPath $tmp){Remove-Item -LiteralPath $tmp -Force}}
}
function VerifyEmbeddedFiles {
 if(-not (SafeArtifact $engine 450MB) -or
    -not (SafeArtifact $manifest 10000)){
  throw 'JREI_OFFLINE_ENGINE_ARTIFACT_MISSING'
 }
 $data=Get-Content -LiteralPath $manifest -Raw -Encoding UTF8 |
       ConvertFrom-Json -ErrorAction Stop
 if($data.schema -cne 'jr.jrei.offline-engine-package.v1' -or
    $data.source_branch -cne 'migration/bertina-linux6' -or
    [string]$data.source_commit -cnotmatch '^[a-f0-9]{40}$' -or
    [string]$data.engine_sha256 -cnotmatch '^[a-f0-9]{64}$'){
  throw 'JREI_OFFLINE_ENGINE_MANIFEST_INVALID'
 }
 $actual=(Get-FileHash -LiteralPath $engine -Algorithm SHA256).Hash.ToLowerInvariant()
 if($actual -cne [string]$data.engine_sha256){
  throw 'JREI_OFFLINE_ENGINE_CHECKSUM_MISMATCH'
 }
}
if(-not (SafeArtifact $engine 450MB)){
 Emit 'ENGINE_BINARY_NOT_PRESENT'
 if($Mode -eq 'Install'){throw 'JREI_OFFLINE_ENGINE_REQUIRED'}
 return
}
VerifyEmbeddedFiles
$task=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if($null -ne $task -and -not (TaskOwned $task)){
 throw 'JREI_EXISTING_TASK_DIFFERENT_OWNER_PRESERVED'
}
if($Mode -eq 'Status'){
 Emit $(if(LocalReady){'OWNER_PRIVATE_8092_ALREADY_RESPONDING'}else{
    'OWNER_PRIVATE_8092_NOT_RESPONDING'})
 Emit $(if($null -eq $task){'OWNER_TASK_NOT_REGISTERED'}else{
    'OWNER_TASK_PRESENT'})
 Emit 'NO_INSTALL_OR_RUNTIME_CHANGE'
 return
}
if($Mode -eq 'Start'){
 # A normal desktop click can restart only the ORIGINAL known owner task,
 # even if the task was previously installed from the Python 3.13 source.
 # No new task/keys/model/runtime is registered by this mode.
 if($null -eq $task){throw 'JREI_OWNER_ORIGINAL_TASK_NOT_INSTALLED'}
 if($task.Actions.Count -ne 1){throw 'JREI_OWNER_TASK_ACTION_AMBIGUOUS'}
 $old=$task.Actions[0]
 $exe=[IO.Path]::GetFullPath(
   [Environment]::ExpandEnvironmentVariables([string]$old.Execute))
 $folder=[IO.Path]::GetFullPath($PSScriptRoot)+[IO.Path]::DirectorySeparatorChar
 $frozen=(
   $exe.StartsWith($folder,[StringComparison]::OrdinalIgnoreCase) -and
   $exe -imatch '[\\/]engine-v[0-9]+\.[0-9]+\.[0-9]+[\\/]JREI-Engine\.exe
# Existing responsive engine may be busy with learning and drafts; never
# terminate, rewire, or overwrite its current Python source. Files are copied
# under the application directory by the parent installer only.
if(LocalReady){
 Receipt 'EXISTING_LIVE_ENGINE_PRESERVED_UPDATE_DEFERRED'
 Emit 'EXISTING_LIVE_ENGINE_PRESERVED'
 return
}
$work=Split-Path -Path $engine -Parent
$newAction=New-ScheduledTaskAction -Execute $engine -Argument '--serve' -WorkingDirectory $work
$oldAction=$null
$created=$false
if($null -eq $task){
 $trigger=New-ScheduledTaskTrigger -AtLogOn -User $owner.Name
 $principal=New-ScheduledTaskPrincipal -UserId $owner.Name -LogonType Interactive -RunLevel Limited
 $settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -MultipleInstances IgnoreNew -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
 Register-ScheduledTask -TaskName $taskName -Action $newAction -Trigger $trigger -Principal $principal -Settings $settings -Description 'JREI original owner-private Windows intelligence core on loopback 8092' -ErrorAction Stop | Out-Null
 $created=$true
 Emit 'OWNER_PRIVATE_OFFLINE_TASK_REGISTERED'
}else{
 if($task.Actions.Count -ne 1){throw 'JREI_EXISTING_TASK_ACTION_AMBIGUOUS_PRESERVED'}
 $oldAction=$task.Actions[0]
 $oldArgs=[string]$oldAction.Arguments
 $oldExecute=[string]$oldAction.Execute
 # Only previously known ORIGINAL 8092 command center actions are eligible.
 # Never rewire an unknown named task or another user's process.
 $expectedPy=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'JREI-Python\venv\Scripts\python.exe'))
 $priorExe=[IO.Path]::GetFullPath([Environment]::ExpandEnvironmentVariables($oldExecute))
 $programDir=[IO.Path]::GetFullPath($PSScriptRoot)+[IO.Path]::DirectorySeparatorChar
 $knownFrozen=(
    $priorExe.StartsWith($programDir,[StringComparison]::OrdinalIgnoreCase) -and
    $priorExe -imatch '[\\/]engine-v[0-9]+\.[0-9]+\.[0-9]+[\\/]JREI-Engine\.exe
 $knownPython=($priorExe -ieq $expectedPy -and
               $oldArgs -ceq '-B -m jrei_service.windows_command_center --serve')
 if(-not ($knownFrozen -or $knownPython)){
  throw 'JREI_EXISTING_TASK_ACTION_UNKNOWN_PRESERVED'
 }
 # If a task is already RUNNING but not answering, avoid interrupting it.
 $liveTask=Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
 if($liveTask.State -eq 'Running'){
  Receipt 'EXISTING_TASK_RUNNING_UNRESPONSIVE_NO_REPLACEMENT'
  Emit 'EXISTING_TASK_RUNNING_HELD_FOR_MANUAL_REVIEW'
  return
 }
 # A nonresponsive, idle, verified owner task can be repointed to the
 # bundled owner core, with its previous action restored on failure.
 Set-ScheduledTask -TaskName $taskName -Action $newAction -ErrorAction Stop | Out-Null
 Emit 'ORIGINAL_OWNER_TASK_UPDATED_WITH_ROLLBACK'
}
$ready=$false
try{
 Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
 for($i=0;$i -lt 12;$i++){
  if(LocalReady){$ready=$true;break}
  Start-Sleep -Seconds 2
 }
 if(-not $ready){throw 'JREI_PRIVATE_OFFLINE_ENGINE_NOT_RESPONDING'}
 Receipt 'ORIGINAL_PRIVATE_ENGINE_RUNNING_ON_8092'
 Emit 'ORIGINAL_PRIVATE_ENGINE_RUNNING_ON_8092'
}catch{
 # Roll back only *this* task registration/action. Preserve data, models,
 # private files and other tasks regardless of startup outcome.
 if($created){
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
 }elseif($null -ne $oldAction){
  Set-ScheduledTask -TaskName $taskName -Action $oldAction -ErrorAction SilentlyContinue | Out-Null
 }
 try{Receipt 'STARTUP_FAILED_PREVIOUS_ACTION_RETAINED'}catch{}
 throw
}
 -and
    $oldArgs -ceq '--serve'
 )
 $knownPython=($priorExe -ieq $expectedPy -and
               $oldArgs -ceq '-B -m jrei_service.windows_command_center --serve')
 if(-not ($knownFrozen -or $knownPython)){
  throw 'JREI_EXISTING_TASK_ACTION_UNKNOWN_PRESERVED'
 }
 # If a task is already RUNNING but not answering, avoid interrupting it.
 $liveTask=Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
 if($liveTask.State -eq 'Running'){
  Receipt 'EXISTING_TASK_RUNNING_UNRESPONSIVE_NO_REPLACEMENT'
  Emit 'EXISTING_TASK_RUNNING_HELD_FOR_MANUAL_REVIEW'
  return
 }
 # A nonresponsive, idle, verified owner task can be repointed to the
 # bundled owner core, with its previous action restored on failure.
 Set-ScheduledTask -TaskName $taskName -Action $newAction -ErrorAction Stop | Out-Null
 Emit 'ORIGINAL_OWNER_TASK_UPDATED_WITH_ROLLBACK'
}
$ready=$false
try{
 Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
 for($i=0;$i -lt 12;$i++){
  if(LocalReady){$ready=$true;break}
  Start-Sleep -Seconds 2
 }
 if(-not $ready){throw 'JREI_PRIVATE_OFFLINE_ENGINE_NOT_RESPONDING'}
 Receipt 'ORIGINAL_PRIVATE_ENGINE_RUNNING_ON_8092'
 Emit 'ORIGINAL_PRIVATE_ENGINE_RUNNING_ON_8092'
}catch{
 # Roll back only *this* task registration/action. Preserve data, models,
 # private files and other tasks regardless of startup outcome.
 if($created){
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
 }elseif($null -ne $oldAction){
  Set-ScheduledTask -TaskName $taskName -Action $oldAction -ErrorAction SilentlyContinue | Out-Null
 }
 try{Receipt 'STARTUP_FAILED_PREVIOUS_ACTION_RETAINED'}catch{}
 throw
}
 -and
   [string]$old.Arguments -ceq '--serve'
 )
 $legacy=(
   $exe -ieq [IO.Path]::GetFullPath(
      (Join-Path $env:LOCALAPPDATA 'JREI-Python\venv\Scripts\python.exe')) -and
   [string]$old.Arguments -ceq '-B -m jrei_service.windows_command_center --serve'
 )
 if(-not ($frozen -or $legacy)){
  throw 'JREI_UNRECOGNIZED_OWNER_TASK_PRESERVED'
 }
 if(LocalReady){Emit 'ORIGINAL_PRIVATE_JREI_ALREADY_RESPONDING';return}
 Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
 for($i=0;$i -lt 12;$i++){
  if(LocalReady){Emit 'ORIGINAL_PRIVATE_JREI_RESPONDING';return}
  Start-Sleep -Seconds 2
 }
 throw 'JREI_OWNER_TASK_START_UNVERIFIED'
}
if(-not $OwnerApproved){throw 'JREI_ENGINE_EXPLICIT_OWNER_INSTALL_REQUIRED'}
# Existing responsive engine may be busy with learning and drafts; never
# terminate, rewire, or overwrite its current Python source. Files are copied
# under the application directory by the parent installer only.
if(LocalReady){
 Receipt 'EXISTING_LIVE_ENGINE_PRESERVED_UPDATE_DEFERRED'
 Emit 'EXISTING_LIVE_ENGINE_PRESERVED'
 return
}
$work=Split-Path -Path $engine -Parent
$newAction=New-ScheduledTaskAction -Execute $engine -Argument '--serve' -WorkingDirectory $work
$oldAction=$null
$created=$false
if($null -eq $task){
 $trigger=New-ScheduledTaskTrigger -AtLogOn -User $owner.Name
 $principal=New-ScheduledTaskPrincipal -UserId $owner.Name -LogonType Interactive -RunLevel Limited
 $settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -MultipleInstances IgnoreNew -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
 Register-ScheduledTask -TaskName $taskName -Action $newAction -Trigger $trigger -Principal $principal -Settings $settings -Description 'JREI original owner-private Windows intelligence core on loopback 8092' -ErrorAction Stop | Out-Null
 $created=$true
 Emit 'OWNER_PRIVATE_OFFLINE_TASK_REGISTERED'
}else{
 if($task.Actions.Count -ne 1){throw 'JREI_EXISTING_TASK_ACTION_AMBIGUOUS_PRESERVED'}
 $oldAction=$task.Actions[0]
 $oldArgs=[string]$oldAction.Arguments
 $oldExecute=[string]$oldAction.Execute
 # Only previously known ORIGINAL 8092 command center actions are eligible.
 # Never rewire an unknown named task or another user's process.
 $expectedPy=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'JREI-Python\venv\Scripts\python.exe'))
 $priorExe=[IO.Path]::GetFullPath([Environment]::ExpandEnvironmentVariables($oldExecute))
 $programDir=[IO.Path]::GetFullPath($PSScriptRoot)+[IO.Path]::DirectorySeparatorChar
 $knownFrozen=(
    $priorExe.StartsWith($programDir,[StringComparison]::OrdinalIgnoreCase) -and
    $priorExe -imatch '[\\/]engine-v[0-9]+\.[0-9]+\.[0-9]+[\\/]JREI-Engine\.exe
 $knownPython=($priorExe -ieq $expectedPy -and
               $oldArgs -ceq '-B -m jrei_service.windows_command_center --serve')
 if(-not ($knownFrozen -or $knownPython)){
  throw 'JREI_EXISTING_TASK_ACTION_UNKNOWN_PRESERVED'
 }
 # If a task is already RUNNING but not answering, avoid interrupting it.
 $liveTask=Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
 if($liveTask.State -eq 'Running'){
  Receipt 'EXISTING_TASK_RUNNING_UNRESPONSIVE_NO_REPLACEMENT'
  Emit 'EXISTING_TASK_RUNNING_HELD_FOR_MANUAL_REVIEW'
  return
 }
 # A nonresponsive, idle, verified owner task can be repointed to the
 # bundled owner core, with its previous action restored on failure.
 Set-ScheduledTask -TaskName $taskName -Action $newAction -ErrorAction Stop | Out-Null
 Emit 'ORIGINAL_OWNER_TASK_UPDATED_WITH_ROLLBACK'
}
$ready=$false
try{
 Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
 for($i=0;$i -lt 12;$i++){
  if(LocalReady){$ready=$true;break}
  Start-Sleep -Seconds 2
 }
 if(-not $ready){throw 'JREI_PRIVATE_OFFLINE_ENGINE_NOT_RESPONDING'}
 Receipt 'ORIGINAL_PRIVATE_ENGINE_RUNNING_ON_8092'
 Emit 'ORIGINAL_PRIVATE_ENGINE_RUNNING_ON_8092'
}catch{
 # Roll back only *this* task registration/action. Preserve data, models,
 # private files and other tasks regardless of startup outcome.
 if($created){
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
 }elseif($null -ne $oldAction){
  Set-ScheduledTask -TaskName $taskName -Action $oldAction -ErrorAction SilentlyContinue | Out-Null
 }
 try{Receipt 'STARTUP_FAILED_PREVIOUS_ACTION_RETAINED'}catch{}
 throw
}
 -and
    $oldArgs -ceq '--serve'
 )
 $knownPython=($priorExe -ieq $expectedPy -and
               $oldArgs -ceq '-B -m jrei_service.windows_command_center --serve')
 if(-not ($knownFrozen -or $knownPython)){
  throw 'JREI_EXISTING_TASK_ACTION_UNKNOWN_PRESERVED'
 }
 # If a task is already RUNNING but not answering, avoid interrupting it.
 $liveTask=Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
 if($liveTask.State -eq 'Running'){
  Receipt 'EXISTING_TASK_RUNNING_UNRESPONSIVE_NO_REPLACEMENT'
  Emit 'EXISTING_TASK_RUNNING_HELD_FOR_MANUAL_REVIEW'
  return
 }
 # A nonresponsive, idle, verified owner task can be repointed to the
 # bundled owner core, with its previous action restored on failure.
 Set-ScheduledTask -TaskName $taskName -Action $newAction -ErrorAction Stop | Out-Null
 Emit 'ORIGINAL_OWNER_TASK_UPDATED_WITH_ROLLBACK'
}
$ready=$false
try{
 Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
 for($i=0;$i -lt 12;$i++){
  if(LocalReady){$ready=$true;break}
  Start-Sleep -Seconds 2
 }
 if(-not $ready){throw 'JREI_PRIVATE_OFFLINE_ENGINE_NOT_RESPONDING'}
 Receipt 'ORIGINAL_PRIVATE_ENGINE_RUNNING_ON_8092'
 Emit 'ORIGINAL_PRIVATE_ENGINE_RUNNING_ON_8092'
}catch{
 # Roll back only *this* task registration/action. Preserve data, models,
 # private files and other tasks regardless of startup outcome.
 if($created){
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
 }elseif($null -ne $oldAction){
  Set-ScheduledTask -TaskName $taskName -Action $oldAction -ErrorAction SilentlyContinue | Out-Null
 }
 try{Receipt 'STARTUP_FAILED_PREVIOUS_ACTION_RETAINED'}catch{}
 throw
}
