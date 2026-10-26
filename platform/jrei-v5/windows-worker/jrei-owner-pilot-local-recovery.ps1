#Requires -Version 5.1
<#
 JREI PRIVATE PILOT RECOVERY (source-staged; NOT INSTALLED/EXECUTED).
 Default: read-only, no service/job changes.
 -Repair -OwnerApproved: may start the TWO existing audited task entries only.
 Never downloads, re-registers keys, exposes ports or permits public AI.
#>
[CmdletBinding()]
param(
  [string]$ConfigPath = (Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-config.json'),
  [switch]$Repair,
  [switch]$OwnerApproved
)
$ErrorActionPreference = 'Stop'
if($env:OS -ne 'Windows_NT') { throw 'JREI_WINDOWS_ONLY' }
if($Repair -and -not $OwnerApproved) { throw 'JREI_EXPLICIT_APPROVAL_REQUIRED' }
if(-not [IO.Path]::IsPathRooted($ConfigPath) -or -not [IO.File]::Exists($ConfigPath)) {
  throw 'JREI_PRIVATE_CONFIG_MISSING'
}
$privatePath=[IO.Path]::GetFullPath($ConfigPath)
if($privatePath.Length -gt 500) { throw 'JREI_PRIVATE_PATH_TOO_LONG' }
try {
  $cfg=Get-Content -LiteralPath $privatePath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch { throw 'JREI_PRIVATE_CONFIG_UNREADABLE' }
$c=$cfg.localChat
if($null -eq $c -or
   $cfg.nodeId -cnotmatch '^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$' -or
   $c.ownerApproved -ne $true -or $c.rightsReviewed -ne $true -or
   $c.enabled -ne $false -or $c.modelSha256 -cnotmatch '^[a-f0-9]{64}$' -or
   $c.backendExeSha256 -cnotmatch '^[a-f0-9]{64}$') {
  throw 'JREI_PRIVATE_PILOT_CONFIG_NOT_APPROVED'
}
try { $uri=[uri]([string]$c.endpoint) }
catch { throw 'JREI_LOOPBACK_INVALID' }
if($uri.Scheme -cne 'http' -or $uri.Host -cne '127.0.0.1' -or
   $uri.AbsolutePath -cne '/v1/chat/completions' -or
   $uri.Port -lt 1024 -or $uri.Port -gt 65535 -or
   $uri.UserInfo -ne '' -or $uri.Query -ne '' -or $uri.Fragment -ne '') {
  throw 'JREI_LOOPBACK_INVALID'
}
function ExistingTask([string]$name,[string]$marker) {
  $task=Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  if($null -eq $task) { throw 'JREI_REGISTERED_TASK_MISSING' }
  $actions=@($task.Actions)
  if($actions.Count -ne 1 -or
     -not ([string]$actions[0].Arguments).Contains($privatePath) -or
     -not ([string]$actions[0].Arguments).Contains($marker)) {
    throw 'JREI_TASK_CONFIG_OR_ACTION_MISMATCH'
  }
  $triggers=@($task.Triggers | Where-Object {
    $_.CimClass.CimClassName -eq 'MSFT_TaskLogonTrigger'
  })
  if($triggers.Count -eq 0) { throw 'JREI_LOGON_TRIGGER_MISSING' }
  return $task
}
$modelName='JREI-Owner-Local-Model'
$pilotName='JREI-Owner-Private-Pilot-Worker'
$modelTask=ExistingTask $modelName 'jrei-local-model-start.ps1'
$pilotTask=ExistingTask $pilotName 'start-pilot'
$healthUrl='http://127.0.0.1:' + [string]$uri.Port + '/health'
function Healthy {
  try {
    $h=Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3 -Method GET
    return $h.status -ceq 'ok'
  } catch { return $false }
}
function PilotPresent {
  try {
    $matches=@(Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
      Where-Object {
        $_.CommandLine -and $_.CommandLine.Contains('jrei-worker.mjs') -and
        $_.CommandLine.Contains('start-pilot') -and
        $_.CommandLine.Contains($privatePath)
      })
    return $matches.Count -gt 0
  } catch { return $false }
}
$healthy=Healthy
Write-Output ('[JREI] OWNER_PILOT_MODEL_LOOPBACK=' + $(if($healthy){'HEALTHY'}else{'UNAVAILABLE'}))
$pilot=PilotPresent
Write-Output ('[JREI] OWNER_PILOT_PROCESS=' + $(if($pilot){'PRESENT'}else{'NOT_OBSERVED'}))
Write-Output '[JREI] PUBLIC_AI_RELEASE=UNCHANGED_OFF'
if(-not $Repair) {
  Write-Output '[JREI] MODE=READ_ONLY'
  Write-Output '[JREI] SIGNED_BERTINA_ROUND_TRIP=NOT_TESTED'
  return
}
if(-not $healthy) {
  $occupied=@(Get-NetTCPConnection -State Listen -LocalPort $uri.Port -ErrorAction SilentlyContinue)
  if($occupied.Count -gt 0) { throw 'JREI_UNVERIFIED_PROCESS_OCCUPIES_LOOPBACK' }
  $fresh=Get-ScheduledTask -TaskName $modelName -ErrorAction Stop
  if($fresh.State.ToString() -eq 'Running') {
    throw 'JREI_MODEL_TASK_RUNNING_BUT_HEALTH_FAILED'
  }
  Start-ScheduledTask -TaskName $modelName -ErrorAction Stop
  Write-Output '[JREI] EXISTING_MODEL_TASK_START_REQUESTED'
  # Short finite startup readiness observation, NOT a global task/crawl cap.
  for($probe=0;$probe -lt 30;$probe++) {
    Start-Sleep -Seconds 3
    if(Healthy) {$healthy=$true;break}
    $fresh=Get-ScheduledTask -TaskName $modelName -ErrorAction Stop
    if($fresh.State.ToString() -ne 'Running') {break}
  }
}
if(-not $healthy) { throw 'JREI_MODEL_UNAVAILABLE_PILOT_NOT_STARTED' }
Write-Output '[JREI] OWNER_PILOT_MODEL_LOOPBACK_AFTER_REPAIR=HEALTHY'
if(-not (PilotPresent)) {
  $fresh=Get-ScheduledTask -TaskName $pilotName -ErrorAction Stop
  if($fresh.State.ToString() -eq 'Running') {
    throw 'JREI_PILOT_TASK_RUNNING_WITHOUT_VERIFIED_PROCESS'
  }
  Start-ScheduledTask -TaskName $pilotName -ErrorAction Stop
  Write-Output '[JREI] EXISTING_PILOT_TASK_START_REQUESTED'
} else {
  Write-Output '[JREI] EXISTING_PILOT_PROCESS_ALREADY_PRESENT'
}
Write-Output '[JREI] SIGNED_BERTINA_ROUND_TRIP=NOT_TESTED'
Write-Output '[JREI] PUBLIC_AI_RELEASE=UNCHANGED_OFF'
