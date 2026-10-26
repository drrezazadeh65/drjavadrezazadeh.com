#Requires -Version 5.1
<#
  Read-only evaluation Worker inspection for EXISTING Node A.
  No model or GPU needed; never prints signing keys or private config.
#>
[CmdletBinding()]param()
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'JREI_WINDOWS_ONLY'}
$path=Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-config.json'
$keyPath=Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-key.dpapi'
if(-not (Test-Path -LiteralPath $path -PathType Leaf)){throw 'JREI_NODE_A_PRIVATE_CONFIG_MISSING'}
try{$c=Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json}
catch{throw 'JREI_NODE_A_PRIVATE_CONFIG_UNREADABLE'}
if([string]$c.nodeId -cne '28b1c0d2-b833-41cb-97e2-df92c9373de0'){
  throw 'JREI_THIS_WINDOWS_USER_IS_NOT_NODE_A'
}
Write-Output '[JREI] NODE_A_SIGNED_IDENTITY=MATCHED'
Write-Output ('[JREI] NODE_A_DPAPI_KEY_PRESENT='+
  $(if(Test-Path -LiteralPath $keyPath -PathType Leaf){'YES'}else{'NO'}))
$task=Get-ScheduledTask -TaskName 'JREI-Owner-Outbound-Worker' -ErrorAction SilentlyContinue
if($null -eq $task){
  Write-Output '[JREI] NODE_A_EVALUATION_TASK=NOT_REGISTERED'
}else{
  $info=Get-ScheduledTaskInfo -TaskName 'JREI-Owner-Outbound-Worker' -ErrorAction SilentlyContinue
  $logon=@($task.Triggers | Where-Object {
    $_.CimClass.CimClassName -eq 'MSFT_TaskLogonTrigger'
  }).Count -gt 0
  $act=@($task.Actions)
  $correctConfig=($act.Count -eq 1 -and ([string]$act[0].Arguments).Contains($path))
  Write-Output ('[JREI] NODE_A_EVALUATION_TASK='+$task.State.ToString().ToUpperInvariant())
  Write-Output ('[JREI] NODE_A_AT_OWNER_LOGON='+$(if($logon){'YES'}else{'NO'}))
  Write-Output ('[JREI] NODE_A_SAME_PRIVATE_CONFIG='+$(if($correctConfig){'YES'}else{'NO'}))
  if($null -ne $info){
    Write-Output ('[JREI] NODE_A_LAST_TASK_RESULT='+[string]$info.LastTaskResult)
    Write-Output ('[JREI] NODE_A_LAST_TASK_START='+$info.LastRunTime.ToString('yyyy-MM-dd HH:mm:ss'))
  }
}
Write-Output '[JREI] NODE_A_LIVE_SIGNED_HEARTBEAT=NOT_VERIFIED_BY_LOCAL_READ_ONLY_CHECK'
Write-Output '[JREI] NODE_A_QWEN_INFERENCE=NOT_REQUIRED'
Write-Output '[JREI] NODE_B_QWEN_AND_PRIVATE_PILOT=UNTOUCHED'
