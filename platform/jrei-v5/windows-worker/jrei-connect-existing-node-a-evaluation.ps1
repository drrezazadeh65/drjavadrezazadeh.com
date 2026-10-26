#Requires -Version 5.1
<#
  JREI Node A: reconnect the EXISTING signed outbound evaluation worker.
  No model required. Owner action only; no DPAPI changes, key rotation,
  database changes, firewall changes, model downloads or public AI grant.
  AtLogOn tasks require the same Windows owner to sign in.
#>
[CmdletBinding()]
param([switch]$OwnerApproved)
$ErrorActionPreference='Stop'
if(-not $OwnerApproved){throw 'JREI_NODE_A_OWNER_APPROVAL_REQUIRED'}
if($env:OS -ne 'Windows_NT'){throw 'JREI_WINDOWS_ONLY'}
$privatePath=Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-config.json'
$keyPath=Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-key.dpapi'
if(-not (Test-Path -LiteralPath $privatePath -PathType Leaf) -or
   -not (Test-Path -LiteralPath $keyPath -PathType Leaf)){
  throw 'JREI_NODE_A_ORIGINAL_PRIVATE_CONFIG_OR_KEY_MISSING'
}
try{
  $cfg=Get-Content -LiteralPath $privatePath -Raw -Encoding UTF8 | ConvertFrom-Json
}catch{throw 'JREI_NODE_A_PRIVATE_CONFIG_UNREADABLE'}
if($cfg.protocol -cne 'jr.jrei.windows-worker.v1' -or
   $cfg.origin -cne 'https://drjavadrezazadeh.com' -or
   [string]$cfg.nodeId -cne '28b1c0d2-b833-41cb-97e2-df92c9373de0'){
  throw 'JREI_NODE_A_REGISTERED_SIGNED_IDENTITY_REQUIRED'
}
$worker=Join-Path $PSScriptRoot 'jrei-worker.mjs'
$startup=Join-Path $PSScriptRoot 'jrei-managed-startup.ps1'
if(-not (Test-Path -LiteralPath $worker -PathType Leaf) -or
   -not (Test-Path -LiteralPath $startup -PathType Leaf)){
  throw 'JREI_NODE_A_SOURCE_BUNDLE_INCOMPLETE'
}
$node=(Get-Command node.exe -CommandType Application -ErrorAction Stop).Source
if(-not [IO.Path]::IsPathRooted($node)){
  throw 'JREI_NODE_A_NODE_RUNTIME_UNAVAILABLE'
}
$taskName='JREI-Owner-Outbound-Worker'
$task=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if($null -eq $task){
  & $startup -Mode install -WorkerMode evaluation -ConfigPath $privatePath -OwnerApproved
  $task=Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
  Write-Output '[JREI] NODE_A_EXISTING_SIGNED_EVALUATION_TASK_INSTALLED'
}else{
  Write-Output '[JREI] NODE_A_EXISTING_TASK_PRESERVED'
}
$actions=@($task.Actions)
if($actions.Count -ne 1 -or
   ([IO.Path]::GetFullPath([string]$actions[0].Execute) -ine [IO.Path]::GetFullPath($node)) -or
   -not ([string]$actions[0].Arguments).Contains($worker) -or
   -not ([string]$actions[0].Arguments).Contains($privatePath) -or
   -not ([string]$actions[0].Arguments -match '(^|\s)start(\s|$)')){
  throw 'JREI_NODE_A_EXISTING_TASK_ACTION_REQUIRES_REVIEW'
}
$logon=@($task.Triggers | Where-Object {
  $_.CimClass.CimClassName -eq 'MSFT_TaskLogonTrigger'
}).Count -gt 0
if(-not $logon){throw 'JREI_NODE_A_EXISTING_TASK_MISSING_LOGON_TRIGGER'}
if($task.State -eq 'Disabled'){throw 'JREI_NODE_A_TASK_DISABLED_OWNER_REVIEW_REQUIRED'}
# Respect an already running signed task or manually launched worker.
$active=$false
try {
  $instances=@(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction Stop)
  $active=@($instances | Where-Object {
    $_.CommandLine -and $_.CommandLine.Contains($worker) -and
    $_.CommandLine.Contains($privatePath) -and
    $_.CommandLine -match '(?i)(^|\s)start(\s|$)'
  }).Count -gt 0
}catch{
  # Fail closed: do not start another worker when process state is unavailable.
  throw 'JREI_NODE_A_PROCESS_STATE_UNKNOWN'
}
if($active -or $task.State -eq 'Running'){
  Write-Output '[JREI] NODE_A_SIGNED_WORKER_ALREADY_RUNNING'
}else{
  Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
  Write-Output '[JREI] NODE_A_SIGNED_WORKER_START_REQUESTED'
}
Write-Output '[JREI] NODE_A_SIGNED_CONNECTION_AT_LOGON_CONFIGURED'
Write-Output '[JREI] NODE_A_EVALUATION_ONLY_NO_QWEN_MODEL_INSTALL'
Write-Output '[JREI] NODE_B_KEYS_AND_TASKS_UNCHANGED'
Write-Output '[JREI] BERTINA_SIGNED_HEARTBEAT_STILL_NEEDS_LIVE_VERIFICATION'
