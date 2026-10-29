#Requires -Version 5.1
<#
Owner-confirmed transactional migration of the EXISTING 16GB RX580 GPU task.
Uses staged, SHA-pinned secure launcher and original approved V4 task action.
Install changes only JREI-GPU-Qwen-Private. Restores original task on failure.
No website, JREI v18 app, signed node worker or second PC changes.
#>
[CmdletBinding()]
param([ValidateSet('Status','Install','Restore')][string]$Mode='Status',
      [switch]$OwnerApproved)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -cne 'Windows_NT'){throw 'JREI_GPU_WINDOWS_ONLY'}
$root=Join-Path $env:LOCALAPPDATA 'JREI-GPU-Lab'
$stage=Join-Path $root 'secure-approved'
$source=Join-Path $stage 'jrei-gpu-secure-runtime-v1.ps1'
$manifest=Join-Path $stage 'secure-runtime-v1.json'
$receipt=Join-Path $stage 'secure-task-switch-v1.json'
$keyPath=Join-Path $env:LOCALAPPDATA 'JREI\command-center\gpu-pilot-api-key.txt'
$old=Join-Path $root 'jrei-gpu-16gb-approved.ps1'
$originalSettings=Join-Path $root 'gpu-owner-16gb.json'
$taskName='JREI-GPU-Qwen-Private'
$owner=[Security.Principal.WindowsIdentity]::GetCurrent()
$exe=Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
function Fail([string]$id){throw $id}
function Need([bool]$v,[string]$id){if(-not $v){Fail $id}}
function ReadJson([string]$f){
 Need (Test-Path -LiteralPath $f -PathType Leaf) 'JREI_GPU_FILE_NOT_FOUND'
 return (Get-Content -LiteralPath $f -Raw -Encoding UTF8 | ConvertFrom-Json)
}
function Sha([string]$f){return (Get-FileHash -LiteralPath $f -Algorithm SHA256).Hash.ToLowerInvariant()}
function OwnerSid([string]$principal){
 if($principal -match '^S-1-[0-9]+(-[0-9]+)+$'){return $principal}
 $account=New-Object -TypeName System.Security.Principal.NTAccount -ArgumentList $principal
 return $account.Translate([Security.Principal.SecurityIdentifier]).Value
}
function TaskState {
 $task=Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
 Need ((OwnerSid ([string]$task.Principal.UserId)) -ceq $owner.User.Value) 'JREI_GPU_TASK_OWNER_MISMATCH'
 Need ($task.Principal.RunLevel -eq 'Limited') 'JREI_GPU_TASK_ELEVATION_UNEXPECTED'
 Need (@($task.Actions).Count -eq 1) 'JREI_GPU_UNEXPECTED_TASK_ACTIONS'
 return $task
}
function ExistingAction {
 $a=TaskState
 $originalManifest=ReadJson $originalSettings
 Need ((Test-Path -LiteralPath $old -PathType Leaf) -and
  (Sha $old) -ceq [string]$originalManifest.scriptSha256) 'JREI_GPU_ORIGINAL_RUNNER_HASH_MISMATCH'
 Need ([IO.Path]::GetFullPath([string]$a.Actions[0].Execute).Equals(
  [IO.Path]::GetFullPath($exe),[StringComparison]::OrdinalIgnoreCase)) 'JREI_GPU_TASK_BINARY_UNEXPECTED'
 $oldArgs='-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$old+'" -Mode Run'
 Need ([string]$a.Actions[0].Arguments -ceq $oldArgs) 'JREI_GPU_ORIGINAL_TASK_ACTION_UNEXPECTED'
 return $a.Actions[0]
}
function SecureAction {
 $m=ReadJson $manifest
 Need ($m.schema -ceq 'jr.jrei.gpu-secure-staging.v1' -and
       $m.owner -ceq $owner.Name -and
       $m.ownerSid -ceq $owner.User.Value -and
       $m.originalTaskName -ceq $taskName -and
       $m.stageOnly -eq $true -and
       $m.endpoint -ceq 'http://127.0.0.1:8082') 'JREI_GPU_SECURE_STAGING_MISMATCH'
 Need ((Test-Path -LiteralPath $source -PathType Leaf) -and
  (Sha $source) -ceq [string]$m.secureLauncherSha256) 'JREI_GPU_SECURE_SCRIPT_HASH_MISMATCH'
 Need ((Test-Path -LiteralPath $keyPath -PathType Leaf) -and
       ([string]$m.keyFile) -ceq $keyPath) 'JREI_GPU_KEY_FILE_MISMATCH'
 $key=(Get-Content -LiteralPath $keyPath -Raw -Encoding ASCII).Trim()
 Need ($key -cmatch '^[a-f0-9]{64}$') 'JREI_GPU_KEY_INVALID'
 $secureArgs='-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$source+'" -Mode Run -OwnerApproved'
 return New-ScheduledTaskAction -Execute $exe -Argument $secureArgs -WorkingDirectory $root
}
function PortFree {
 return @(Get-NetTCPConnection -LocalPort 8082 -State Listen -ErrorAction SilentlyContinue).Count -eq 0
}
function WaitFree([int]$seconds=25){
 for($i=0;$i -lt $seconds;$i++){
  if(PortFree){return $true}
  Start-Sleep -Seconds 1
 }
 return (PortFree)
}
function Probe {
 $connections=@(Get-NetTCPConnection -LocalPort 8082 -State Listen -ErrorAction SilentlyContinue)
 Need ($connections.Count -eq 1 -and $connections[0].LocalAddress -eq '127.0.0.1') 'JREI_GPU_PORT_NOT_EXCLUSIVE_LOOPBACK'
 $key=(Get-Content -LiteralPath $keyPath -Raw -Encoding ASCII).Trim()
 $unauthorized=$false
 try{$null=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8082/v1/models' -TimeoutSec 4 -ErrorAction Stop}
 catch{try{$unauthorized=([int]$_.Exception.Response.StatusCode -eq 401)}catch{}}
 Need $unauthorized 'JREI_GPU_UNAUTHENTICATED_ACCESS_NOT_REJECTED'
 $api=Invoke-RestMethod -Uri 'http://127.0.0.1:8082/v1/models' -Headers @{
   Authorization=('Bearer '+$key)
 } -TimeoutSec 5
 Need (@($api.data|Where-Object{$_.id -ceq 'jrei-gpu-lab'}).Count -eq 1) 'JREI_GPU_SECURE_ALIAS_NOT_READY'
 $web=Invoke-WebRequest -Method Options -UseBasicParsing -Uri 'http://127.0.0.1:8082/v1/models' -Headers @{
   Origin='https://jrei-untrusted-check.invalid'
   'Access-Control-Request-Method'='POST'
   'Access-Control-Request-Headers'='authorization'
 } -TimeoutSec 5
 $ac=[string]$web.Headers['Access-Control-Allow-Origin']
 $credentials=[string]$web.Headers['Access-Control-Allow-Credentials']
 Need ($ac -notin @('*','https://jrei-untrusted-check.invalid') -and
       $credentials -cne 'true') 'JREI_GPU_CORS_REMAINED_OPEN'
 $body=@{model='jrei-gpu-lab';messages=@(@{role='user';content='/no_think Respond with exactly: OK'});
   temperature=0;max_tokens=64;stream=$false;chat_template_kwargs=@{enable_thinking=$false}
 }|ConvertTo-Json -Depth 6
 $completion=Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8082/v1/chat/completions' -Headers @{
   Authorization=('Bearer '+$key)
 } -ContentType 'application/json' -Body $body -TimeoutSec 90
 Need (-not [string]::IsNullOrWhiteSpace([string]$completion.choices[0].message.content)) 'JREI_GPU_SECURE_INFERENCE_EMPTY'
 return $true
}
function Restore([object]$oldAction){
 Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 Need (WaitFree 30) 'JREI_GPU_RESTORE_PORT_STILL_OCCUPIED_MANUAL_REVIEW'
 Set-ScheduledTask -TaskName $taskName -Action $oldAction -ErrorAction Stop|Out-Null
 Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
}
if($Mode -eq 'Status'){
 $t=TaskState
 $secure=Test-Path -LiteralPath $source -PathType Leaf
 $r=Test-Path -LiteralPath $receipt -PathType Leaf
 Write-Output ('JREI_GPU_TASK='+$t.State)
 Write-Output ('JREI_GPU_SECURE_SNAPSHOT='+$secure)
 Write-Output ('JREI_GPU_SECURE_RECEIPT='+$r)
 Write-Output ('JREI_GPU_PORT_8082_PRESENT='+(-not (PortFree)))
 Write-Output 'STATUS_IS_READ_ONLY_NO_INSTALL'
 return
}
Need ([bool]$OwnerApproved) 'JREI_GPU_OWNER_CONFIRMATION_REQUIRED'
$task=TaskState
if($Mode -eq 'Restore'){
 Need (Test-Path -LiteralPath $receipt -PathType Leaf) 'JREI_GPU_NO_RESTORE_RECEIPT'
 $saved=ReadJson $receipt
 Need ($saved.schema -ceq 'jr.jrei.gpu-secure-task-switch.v1' -and
       $saved.ownerSid -ceq $owner.User.Value) 'JREI_GPU_RESTORE_OWNER_RECEIPT_MISMATCH'
 $settings=ReadJson $originalSettings
 Need ((Sha $old) -ceq [string]$settings.scriptSha256) 'JREI_GPU_ORIGINAL_RUNNER_MODIFIED'
 $oldArgs=[string]$saved.originalArguments
 Need ($oldArgs -ceq ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$old+'" -Mode Run')) 'JREI_GPU_RESTORE_ORIGINAL_ACTION_MISMATCH'
 $oldAction=New-ScheduledTaskAction -Execute $exe -Argument $oldArgs -WorkingDirectory $root
 Need ($task.Actions[0].Arguments -ceq ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$source+'" -Mode Run -OwnerApproved')) 'JREI_GPU_RESTORE_NOT_CURRENT_SECURE_ACTION'
 Restore $oldAction
 Write-Output 'JREI_GPU_RESTORED_ORIGINAL_V4_TASK'
 return
}
Need (-not (Test-Path -LiteralPath $receipt)) 'JREI_GPU_SWITCH_RECEIPT_EXISTS_REVIEW_FIRST'
$oldAction=ExistingAction
$secureAction=SecureAction
Need (-not (PortFree)) 'JREI_GPU_ORIGINAL_TASK_NOT_SERVING'
# Preserve exact old action before touching the scheduled task.
$rec=[ordered]@{
 schema='jr.jrei.gpu-secure-task-switch.v1'
 owner=$owner.Name;ownerSid=$owner.User.Value
 originalTaskName=$taskName
 originalExecute=[string]$oldAction.Execute
 originalArguments=[string]$oldAction.Arguments
 originalWorkingDirectory=[string]$oldAction.WorkingDirectory
 secureLauncherSha256=Sha $source
 createdAtUtc=[DateTime]::UtcNow.ToString('o')
 recoveryState='PREPARED'
}
[IO.File]::WriteAllText($receipt,($rec|ConvertTo-Json -Depth 4),[Text.UTF8Encoding]::new($false))
$changed=$false
try{
 Stop-ScheduledTask -TaskName $taskName -ErrorAction Stop
 Need (WaitFree 30) 'JREI_GPU_OLD_PROCESS_DID_NOT_EXIT'
 Set-ScheduledTask -TaskName $taskName -Action $secureAction -ErrorAction Stop|Out-Null
 $changed=$true
 Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
 $ready=$false
 for($i=0;$i -lt 60;$i++){
   Start-Sleep -Seconds 2
   try{
     $models=Invoke-RestMethod -Uri 'http://127.0.0.1:8082/v1/models' -TimeoutSec 3 -Headers @{
       Authorization=('Bearer '+(Get-Content -LiteralPath $keyPath -Raw -Encoding ASCII).Trim())
     }
     if(@($models.data|Where-Object{$_.id -ceq 'jrei-gpu-lab'}).Count -eq 1){$ready=$true;break}
   }catch{}
 }
 Need $ready 'JREI_GPU_SECURE_API_NOT_READY'
 $null=Probe
 $rec.recoveryState='SECURE_TASK_RUNNING_VERIFIED'
 [IO.File]::WriteAllText($receipt,($rec|ConvertTo-Json -Depth 4),[Text.UTF8Encoding]::new($false))
 Write-Output 'JREI_GPU_SECURE_TASK_AUTHENTICATED_ACCEPTANCE_PASSED'
 Write-Output 'GPU_37_LAYER_OFFLOAD_STILL_REQUIRES_INDEPENDENT_LOG_ATTESTATION'
 Write-Output 'JREI_APP_V18_NOT_UPDATED;PUBLIC_WEBSITE_NOT_DEPLOYED'
}catch{
 $reason=[string]$_.Exception.Message
 if($reason -cnotmatch '^JREI_[A-Z0-9_]+$'){$reason='JREI_GPU_SWITCH_EXCEPTION'}
 if($changed){
  try{Restore $oldAction;Write-Output 'JREI_GPU_ORIGINAL_TASK_RESTORED'}
  catch{Write-Output 'JREI_GPU_RECOVERY_NEEDS_OWNER_REVIEW'}
 }else{
  # The task can have stopped before the migration is marked changed.
  try{if((TaskState).State -ne 'Running' -and (PortFree)){
    Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
  }}catch{}
 }
 Write-Output ('JREI_GPU_SWITCH_NOT_ACCEPTED='+$reason)
 throw $reason
}
