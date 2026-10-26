#Requires -Version 5.1
<#
  Read-only owner-visible Node B stability check; never prints private JSON,
  DPAPI keys, prompts, or model responses. No task or runtime modifications.
  Healthy loopback and running tasks do not prove live Bertina inference.
#>
[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'JREI_WINDOWS_ONLY'}
$privatePath=Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-config.json'
if(-not [IO.File]::Exists($privatePath)){throw 'JREI_PRIVATE_CONFIG_MISSING'}
try {
  $cfg=Get-Content -LiteralPath $privatePath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {throw 'JREI_PRIVATE_CONFIG_UNREADABLE'}
if([string]$cfg.nodeId -cne '7f742039-6c42-4cb7-9bd3-044e30b059f7'){
  throw 'JREI_NOT_SIGNED_NODE_B'
}
$modelExpected='7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5'
$modelConfigOk=$cfg.localChat.modelSha256 -ceq $modelExpected -and
  $cfg.localChat.modelId -ceq 'jrei-qwen3-4b-q4km' -and
  $cfg.localChat.endpoint -ceq 'http://127.0.0.1:8081/v1/chat/completions'
$modelHealthy=$false
try {
  $probe=Invoke-RestMethod -Uri 'http://127.0.0.1:8081/health' -TimeoutSec 3 -Method GET -ErrorAction Stop
  $modelHealthy=$probe.status -ceq 'ok'
} catch {}
$tasks=@('JREI-Owner-Local-Model','JREI-Owner-Outbound-Worker','JREI-Owner-Private-Pilot-Worker')
Write-Output '[JREI] SIGNED_IDENTITY=NODE_B_MATCHED'
Write-Output ('[JREI] PINNED_MODEL_CONFIG=' + $(if($modelConfigOk){'MATCHED'}else{'MISMATCH'}))
Write-Output ('[JREI] LOOPBACK_HEALTH=' + $(if($modelHealthy){'HEALTHY'}else{'UNAVAILABLE'}))
foreach($name in $tasks){
  $task=Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  if($null -eq $task){
    Write-Output ('[JREI] '+$name+'=NOT_REGISTERED')
    continue
  }
  $info=Get-ScheduledTaskInfo -TaskName $name -ErrorAction SilentlyContinue
  $action=@($task.Actions)
  $configBound=($action.Count -eq 1 -and ([string]$action[0].Arguments).Contains($privatePath))
  $logonTrigger=@($task.Triggers | Where-Object {
    $_.CimClass.CimClassName -eq 'MSFT_TaskLogonTrigger'
  }).Count -gt 0
  Write-Output ('[JREI] '+$name+'=TASK_'+$task.State.ToString().ToUpperInvariant())
  Write-Output ('[JREI] '+$name+'_AT_LOGON='+$(if($logonTrigger){'YES'}else{'NO'}))
  Write-Output ('[JREI] '+$name+'_SAME_PRIVATE_CONFIG='+$(if($configBound){'YES'}else{'NO'}))
  if($null -ne $info){
    Write-Output ('[JREI] '+$name+'_LAST_RESULT='+[string]$info.LastTaskResult)
  }
}
$active=$null
try {
  $active=@(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction Stop | Where-Object {
    $_.CommandLine -and $_.CommandLine.Contains('jrei-worker.mjs') -and
    $_.CommandLine.Contains('start-pilot')
  })
} catch {
  Write-Output '[JREI] PILOT_PROCESS_COUNT=UNKNOWN'
}
if($null -ne $active){Write-Output ('[JREI] PILOT_PROCESS_COUNT='+$active.Count)}
Write-Output '[JREI] BERTINA_SIGNED_ROUND_TRIP=NOT_TESTED_BY_READ_ONLY_CHECK'
Write-Output '[JREI] PUBLIC_CHAT_ACTIVATION=NOT_INFERRED'
