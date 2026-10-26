#Requires -Version 5.1
<#
  Source-staged Windows owner PUBLIC CHAT readiness audit. READ ONLY.
  Does not install / start / stop / change scheduled tasks, files, permissions,
  model approvals or Bertina flags. Never outputs keys or raw config values.
  Uses exact existing approved owner JSON under LocalAppData.
  Signed Bertina chat polling, model quality review, retention Cron and
  production API readiness MUST be independently verified by owner.
#>
[CmdletBinding()]
param(
  [string]$ConfigPath=(Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-config.json')
)
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT') { throw 'JREI_WINDOWS_REQUIRED' }
if(-not [IO.Path]::IsPathRooted($ConfigPath) -or
   -not [IO.File]::Exists($ConfigPath)) {
  throw 'JREI_EXISTING_PRIVATE_CONFIG_NOT_FOUND'
}
$path=[IO.Path]::GetFullPath($ConfigPath)
try { $cfg=Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json }
catch { throw 'JREI_EXISTING_CONFIG_UNREADABLE' }
$chat=$cfg.localChat
if($null -eq $chat) { throw 'JREI_LOCAL_CHAT_CONFIG_MISSING' }
$expected=$null
try { $expected=[uri]([string]$chat.endpoint) }
catch { throw 'JREI_LOCAL_ENDPOINT_INVALID' }
if($expected.Scheme -cne 'http' -or $expected.Host -cne '127.0.0.1' -or
   $expected.AbsolutePath -cne '/v1/chat/completions' -or
   $expected.Port -lt 1024 -or $expected.Port -gt 65535 -or
   $expected.Query -ne '' -or $expected.Fragment -ne '' -or
   $expected.UserInfo -ne '') {
  throw 'JREI_LOCAL_ENDPOINT_MUST_BE_LOOPBACK'
}
function Report([string]$key,[string]$status) {
  Write-Output ('[JREI-PUBLIC] '+$key+'='+$status)
}
function Gate([string]$key,[bool]$passed) {
  if($passed){Report $key 'PASS'}else{Report $key 'BLOCKED'}
}
Report 'AUDIT_MODE' 'READ_ONLY'
Gate 'OWNER_ID_FORMAT' ([string]$cfg.nodeId -cmatch '^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$')
Gate 'PINNED_GGUF_SHA256' ([string]$chat.modelSha256 -cmatch '^[a-f0-9]{64}$')
Gate 'RIGHTS_REVIEWED_LOCAL' ($chat.rightsReviewed -eq $true)
Gate 'OWNER_APPROVED_LOCAL' ($chat.ownerApproved -eq $true)
Gate 'MODEL_RUNTIME_ACCEPTED_LOCAL' ($chat.modelRuntimeVerified -eq $true)
Gate 'INDEPENDENT_QUALITY_ACCEPTED_LOCAL' ($chat.independentQualityAccepted -eq $true)
Gate 'GENERATIVE_WORKER_ENABLED_LOCAL' ($chat.enabled -eq $true)
try {
  $healthUri='http://127.0.0.1:'+([string]$expected.Port)+'/health'
  $health=Invoke-RestMethod -Uri $healthUri -TimeoutSec 5 -Method GET
  Gate 'LOCAL_QWEN_HEALTH' ($health.status -ceq 'ok')
} catch {
  Report 'LOCAL_QWEN_HEALTH' 'BLOCKED'
}
try {
  $task=Get-ScheduledTask -TaskName 'JREI-Owner-Local-Chat-Worker' -ErrorAction Stop
  $actions=@($task.Actions)
  $valid=$actions.Count -eq 1 -and
    ([string]$actions[0].Arguments).Contains('start-chat') -and
    ([string]$actions[0].Arguments).Contains($path)
  Gate 'EXISTING_PUBLIC_CHAT_TASK' $valid
  if($valid) {
    Gate 'EXISTING_CHAT_TASK_RUNNING' ($task.State.ToString() -eq 'Running')
  }
} catch {
  Report 'EXISTING_PUBLIC_CHAT_TASK' 'NOT_REGISTERED'
}
try {
  $quality=Join-Path (Join-Path $env:LOCALAPPDATA 'JREI') 'quality-reviews'
  $reports=@(Get-ChildItem -LiteralPath $quality -Filter 'jrei-qwen-acceptance-*.json' -File -ErrorAction Stop)
  if($reports.Count -eq 0){
    Report 'PRIVATE_QUALITY_EVIDENCE' 'NOT_FOUND'
  }else{
    Report 'PRIVATE_QUALITY_EVIDENCE' 'REVIEW_REQUIRED'
    Report 'PRIVATE_QUALITY_REPORT_COUNT' ([string]$reports.Count)
  }
} catch {
  Report 'PRIVATE_QUALITY_EVIDENCE' 'NOT_FOUND'
}
# Windows cannot attest to Bertina Cron, mother DB flags or independent
# quality on its own. Never make PASS claims about remote server gates.
Report 'BERTINA_RETENTION_CRON' 'SERVER_VERIFICATION_REQUIRED'
Report 'SIGNED_GENERATIVE_POLL' 'SERVER_VERIFICATION_REQUIRED'
Report 'MODEL_OWNER_REGISTRY_ACCEPTANCE' 'SERVER_VERIFICATION_REQUIRED'
Report 'PUBLIC_BACKEND_CAPABILITIES' 'SERVER_VERIFICATION_REQUIRED'
Report 'SITE_PUBLIC_ACTIVATION' 'NOT_PERFORMED'
