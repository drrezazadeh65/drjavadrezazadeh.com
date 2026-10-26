#Requires -Version 5.1
<#
  Owner-approved, additive connection preparation for existing JREI Node A.
  Reuses existing Qwen/llama.cpp, signed DPAPI identity and original mother DB.
  No key rotation, downloads, JSON edits, host flags or inbound ports.
  Execute only on the verified 32-GB Windows Node A.
#>
[CmdletBinding()]
param([switch]$OwnerApproved)
$ErrorActionPreference='Stop'
if(-not $OwnerApproved){throw 'JREI_OWNER_APPROVAL_REQUIRED'}
if($env:OS -ne 'Windows_NT'){throw 'JREI_NODE_A_WINDOWS_ONLY'}
$privatePath=Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-config.json'
if(-not (Test-Path -LiteralPath $privatePath -PathType Leaf)){
  throw 'JREI_EXISTING_PRIVATE_CONFIGURATION_MISSING'
}
try {
  $cfg=Get-Content -LiteralPath $privatePath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {throw 'JREI_EXISTING_PRIVATE_CONFIGURATION_UNREADABLE'}
if($cfg.protocol -cne 'jr.jrei.windows-worker.v1' -or
   $cfg.origin -cne 'https://drjavadrezazadeh.com' -or
   [string]$cfg.nodeId -notmatch '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' -or
   $cfg.localChat.ownerApproved -ne $true){
  throw 'JREI_EXISTING_NODE_A_IDENTITY_OR_OWNER_APPROVAL_MISSING'
}
if([string]$cfg.localChat.modelSha256 -cne
   '7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5' -or
   [string]$cfg.localChat.backendExeSha256 -cne
   '0dd502d324329cf7be521d8bdb68a677a94f1fa3815f7444dd342778b484f820' -or
   [string]$cfg.localChat.endpoint -cne
   'http://127.0.0.1:8081/v1/chat/completions'){
  throw 'JREI_EXISTING_NODE_A_QWEN_PIN_MISMATCH'
}
try {
  $totalRam=(Get-CimInstance Win32_ComputerSystem -ErrorAction Stop).TotalPhysicalMemory
} catch {throw 'JREI_NODE_A_HARDWARE_IDENTITY_UNCONFIRMED'}
if($totalRam -lt 28GB){throw 'JREI_NODE_A_32GB_HARDWARE_REQUIRED'}
$startup=Join-Path $PSScriptRoot 'jrei-managed-startup.ps1'
$launcher=Join-Path $PSScriptRoot 'jrei-local-model-start.ps1'
$worker=Join-Path $PSScriptRoot 'jrei-worker.mjs'
foreach($required in @($startup,$launcher,$worker)){
  if(-not (Test-Path -LiteralPath $required -PathType Leaf)){
    throw 'JREI_EXISTING_SOURCE_BUNDLE_INCOMPLETE'
  }
}
function Ensure-ExistingOrInstall([string]$name,[string]$mode,[string]$expectedFile){
  $task=Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  if($null -ne $task){
    $actions=@($task.Actions)
    if($actions.Count -ne 1 -or
       -not ([string]$actions[0].Arguments).Contains($expectedFile)){
      throw 'JREI_EXISTING_SCHEDULED_TASK_DIFFERS_REVIEW_REQUIRED'
    }
    Write-Output ('[JREI] EXISTING_TASK_PRESERVED_'+$mode.ToUpperInvariant())
    return
  }
  & $startup -Mode install -WorkerMode $mode -ConfigPath $privatePath -OwnerApproved
}
function Start-Registered([string]$name,[string]$mode){
  $task=Get-ScheduledTask -TaskName $name -ErrorAction Stop
  if($task.State -eq 'Running'){
    Write-Output ('[JREI] TASK_ALREADY_RUNNING_'+$mode.ToUpperInvariant())
    return
  }
  if($task.State -eq 'Disabled'){
    throw 'JREI_EXISTING_TASK_DISABLED_OWNER_REVIEW_REQUIRED'
  }
  Start-ScheduledTask -TaskName $name -ErrorAction Stop
  Write-Output ('[JREI] TASK_START_REQUESTED_'+$mode.ToUpperInvariant())
}
Ensure-ExistingOrInstall 'JREI-Owner-Local-Model' 'model' 'jrei-local-model-start.ps1'
# Existing local model should not be replaced just because a logon task exists.
$healthy=$false
try {
  $health=Invoke-RestMethod -Uri 'http://127.0.0.1:8081/health' -Method Get -TimeoutSec 3 -ErrorAction Stop
  $healthy=$health.status -ceq 'ok'
} catch {}
if($healthy){
  Write-Output '[JREI] EXISTING_LOOPBACK_MODEL_HEALTHY'
} else {
  Start-Registered 'JREI-Owner-Local-Model' 'model'
}
$mode=$null
if($cfg.localChat.enabled -eq $true -and
   $cfg.localChat.rightsReviewed -eq $true -and
   $cfg.localChat.modelRuntimeVerified -eq $true -and
   $cfg.localChat.independentQualityAccepted -eq $true){
  $mode='chat'
} elseif($cfg.localChat.enabled -eq $false -and
         $cfg.localChat.rightsReviewed -eq $true){
  $mode='pilot'
}
if($null -eq $mode){
  Write-Output '[JREI] MODEL_PERSISTENCE_PREPARED'
  Write-Output '[JREI] SIGNED_GENERATIVE_WORKER_PENDING_PRIVATE_APPROVAL'
  Write-Output '[JREI] PUBLIC_WEBSITE_AI_NOT_ACTIVATED'
  exit 0
}
$name=if($mode -eq 'chat'){'JREI-Owner-Local-Chat-Worker'}
  else{'JREI-Owner-Private-Pilot-Worker'}
Ensure-ExistingOrInstall $name $mode 'jrei-worker.mjs'
# Never terminate a separately launched, already-running approved Worker.
$manualWorker=$false
try {
  $workers=@(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction Stop)
  $requestedCommand=if($mode -eq 'chat'){'start-chat'}else{'start-pilot'}
  $manualWorker=@($workers | Where-Object {
    $_.CommandLine -and $_.CommandLine.Contains('jrei-worker.mjs') -and
    $_.CommandLine.Contains($requestedCommand)
  }).Count -gt 0
} catch {}
if($manualWorker){
  Write-Output '[JREI] EXISTING_GENERATIVE_WORKER_PRESERVED'
} else {
  Start-Registered $name $mode
}
Write-Output ('[JREI] OUTBOUND_SIGNED_WORKER_START_REQUESTED_'+$mode.ToUpperInvariant())
Write-Output '[JREI] RESTART_AT_LOGON_PREPARED_NO_IDENTITY_CHANGE'
Write-Output '[JREI] BERTINA_PRIVATE_GATES_NOT_CHANGED'
Write-Output '[JREI] VERIFY_SIGNED_ROUND_TRIP_BEFORE_PUBLIC_LIVE_CLAIM'
